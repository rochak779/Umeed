/**
 * Non-repository application ports (Implementation.md §11.1): communication,
 * eventing, session/auth. Clock and IdGenerator live in src/shared/ and are
 * imported directly since they have no domain-shaped payload.
 */
import type { Channel } from "../../domain/entities/careCircle.ts";

export type NotificationSendResult = {
  providerReference: string;
  status: "queued" | "sent" | "failed";
};

/** Communication abstraction (Implementation.md §11.6). Mock in local dev, Twilio/push/email later. */
export interface NotificationGateway {
  send(input: {
    channel: Channel;
    recipientId: string;
    idempotencyKey: string;
    templateId: string;
    templateData: Record<string, string>;
  }): Promise<NotificationSendResult>;
}

export type DomainEvent = {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe(type: string, handler: (event: DomainEvent) => void): () => void;
}

export type Session = {
  userId: string;
  email: string;
  expiresAt: string;
};

export interface SessionProvider {
  getSession(): Promise<Session | null>;
  onSessionChange(handler: (session: Session | null) => void): () => void;
}

export type AuthResult =
  | { ok: true; session: Session }
  | {
      ok: false;
      code: "invalid_credentials" | "email_taken" | "invalid_or_expired_token" | "unknown_error";
    };

/**
 * AuthProvider (Implementation.md §11.3). LocalAuthProvider satisfies this in
 * local development; Supabase Auth satisfies it after Phase 10 without any
 * caller needing to change. Sign-in is not gated on email verification
 * (matching common production behaviour) — callers show a pending-
 * verification banner using `isEmailVerified` instead of blocking access.
 */
export interface AuthProvider extends SessionProvider {
  register(input: { displayName: string; email: string; password: string }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { token: string; newPassword: string }): Promise<AuthResult>;
  verifyEmail(token: string): Promise<boolean>;
  isEmailVerified(userId: string): Promise<boolean>;
}

/** Atomic-operation boundary (Implementation.md §11.1). */
export interface UnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
