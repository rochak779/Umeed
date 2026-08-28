import { z } from "zod";
import type { AuthProvider, AuthResult, Session } from "../../../application/ports/infra";
import type { Clock } from "../../../shared/time/Clock";
import { UuidIdGenerator, type IdGenerator } from "../../../shared/id/IdGenerator";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

const AccountSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  emailVerified: z.boolean(),
  emailVerificationToken: z.string().nullable(),
  passwordResetToken: z.string().nullable(),
  passwordResetExpiresAt: z.string().nullable(),
});
type Account = z.infer<typeof AccountSchema>;

const SessionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string(),
  expiresAt: z.string(),
});
type SessionRecord = z.infer<typeof SessionRecordSchema>;

/**
 * Cheap non-cryptographic hash for disposable local/dev fixture passwords
 * only (Implementation.md §11.3: "Do not design custom production password
 * storage or authentication cryptography"). Never used once Supabase Auth
 * replaces this adapter.
 */
function devHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `dev:${hash}`;
}

/**
 * LocalAuthProvider (Implementation.md §11.3). Imitates the production
 * session contract so Supabase Auth can replace it later behind the same
 * AuthProvider interface without callers changing.
 */
export class LocalAuthProvider implements AuthProvider {
  private readonly accounts: LocalCollection<Account>;
  private readonly sessions: LocalCollection<SessionRecord>;
  private readonly sessionChangeHandlers = new Set<(session: Session | null) => void>();
  private currentSessionId: string | null = null;

  constructor(
    store: KeyValueStore,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator = new UuidIdGenerator(),
  ) {
    this.accounts = new LocalCollection(store, "umeed.auth_accounts", AccountSchema, 1);
    this.sessions = new LocalCollection(store, "umeed.auth_sessions", SessionRecordSchema, 1);
    const persisted = this.sessions.all().at(-1);
    if (persisted) this.currentSessionId = persisted.id;
  }

  async register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const existing = this.findAccountByEmail(input.email);
    if (existing) return { ok: false, code: "email_taken" };

    const account: Account = {
      id: this.idGenerator.nextId(),
      displayName: input.displayName,
      email: input.email,
      passwordHash: devHash(input.password),
      emailVerified: false,
      emailVerificationToken: this.idGenerator.nextId(),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    };
    this.accounts.save(account);

    return this.startSession(account);
  }

  async signIn(input: { email: string; password: string }): Promise<AuthResult> {
    const account = this.findAccountByEmail(input.email);
    if (!account || account.passwordHash !== devHash(input.password)) {
      return { ok: false, code: "invalid_credentials" };
    }
    return this.startSession(account);
  }

  async signOut(): Promise<void> {
    this.currentSessionId = null;
    this.notifySessionChange(null);
  }

  async getSession(): Promise<Session | null> {
    if (!this.currentSessionId) return null;
    const record = this.sessions.findById(this.currentSessionId);
    if (!record) return null;
    if (record.expiresAt <= this.clock.now().toISOString()) {
      this.currentSessionId = null;
      return null;
    }
    return { userId: record.userId, email: record.email, expiresAt: record.expiresAt };
  }

  onSessionChange(handler: (session: Session | null) => void): () => void {
    this.sessionChangeHandlers.add(handler);
    return () => this.sessionChangeHandlers.delete(handler);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const account = this.findAccountByEmail(email);
    if (!account) return; // do not reveal whether the email exists
    const token = this.idGenerator.nextId();
    const expiresAt = new Date(this.clock.now().getTime() + RESET_TOKEN_TTL_MS).toISOString();
    this.accounts.save({
      ...account,
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    });
  }

  async resetPassword(input: { token: string; newPassword: string }): Promise<AuthResult> {
    const account = this.accounts.all().find((a) => a.passwordResetToken === input.token);
    const nowIso = this.clock.now().toISOString();
    if (!account || !account.passwordResetExpiresAt || account.passwordResetExpiresAt <= nowIso) {
      return { ok: false, code: "invalid_or_expired_token" };
    }
    const updated: Account = {
      ...account,
      passwordHash: devHash(input.newPassword),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    };
    this.accounts.save(updated);
    return this.startSession(updated);
  }

  async verifyEmail(token: string): Promise<boolean> {
    const account = this.accounts.all().find((a) => a.emailVerificationToken === token);
    if (!account) return false;
    this.accounts.save({ ...account, emailVerified: true, emailVerificationToken: null });
    return true;
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    return this.accounts.findById(userId)?.emailVerified ?? false;
  }

  /** Test-only: fixture accounts need a way to obtain a reset token without an email inbox. */
  async __test__issueResetToken(email: string): Promise<string> {
    await this.requestPasswordReset(email);
    const account = this.findAccountByEmail(email);
    if (!account?.passwordResetToken) throw new Error("no account or token");
    return account.passwordResetToken;
  }

  /** Test-only: fixture accounts need a way to obtain a verification token without an email inbox. */
  async __test__issueVerificationToken(email: string): Promise<string> {
    const account = this.findAccountByEmail(email);
    if (!account?.emailVerificationToken) throw new Error("no account or token");
    return account.emailVerificationToken;
  }

  private findAccountByEmail(email: string): Account | null {
    return this.accounts.all().find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  private startSession(account: Account): AuthResult {
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS).toISOString();
    const record: SessionRecord = {
      id: this.idGenerator.nextId(),
      userId: account.id,
      email: account.email,
      expiresAt,
    };
    this.sessions.save(record);
    this.currentSessionId = record.id;
    const session: Session = { userId: account.id, email: account.email, expiresAt };
    this.notifySessionChange(session);
    return { ok: true, session };
  }

  private notifySessionChange(session: Session | null): void {
    for (const handler of this.sessionChangeHandlers) handler(session);
  }
}
