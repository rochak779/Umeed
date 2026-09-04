import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthResult, Session } from "@/application/ports/infra";

function toSession(user: { id: string; email?: string }, expiresAt: string): Session {
  return { userId: user.id, email: user.email ?? "", expiresAt };
}

/**
 * Supabase Auth adapter for the AuthProvider port (Implementation.md §11.1,
 * Phase 10). Two methods below are genuine adaptations, not 1:1 passthroughs
 * — see the design doc §3.2 for why:
 *
 * - verifyEmail / isEmailVerified: with "Confirm email" turned off for this
 *   project (Global Constraints), Supabase confirms every account
 *   immediately on signUp. There is no separate token to redeem, so these
 *   just report the current session's actual confirmation state rather than
 *   performing a manual redemption.
 * - resetPassword: Supabase's recovery link establishes a recovery session
 *   directly (PKCE `code` exchange) rather than handing the app a bare
 *   token to redeem against a stored record. `input.token` here is that
 *   PKCE code — see Task 6 for the one-line UI adaptation that renames the
 *   query param it's read from.
 */
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly getClient: () => SupabaseClient) {}

  async register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const client = this.getClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) {
      // Supabase returns 422 for several distinct problems (weak password,
      // other validation failures — not just a duplicate email), so status
      // alone can't disambiguate; only the specific error code means the
      // email is actually taken.
      if (error.code === "user_already_exists") {
        return { ok: false, code: "email_taken" };
      }
      return { ok: false, code: "unknown_error" };
    }
    if (!data.session || !data.user) {
      // Should not happen with "Confirm email" off (Global Constraints) —
      // treated as a hard failure rather than silently returning a
      // sessionless "ok" the AuthResult type can't represent.
      return { ok: false, code: "unknown_error" };
    }
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async signIn(input: { email: string; password: string }): Promise<AuthResult> {
    const client = this.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session || !data.user) {
      return { ok: false, code: "invalid_credentials" };
    }
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async signOut(): Promise<void> {
    await this.getClient().auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const client = this.getClient();
    // getUser() revalidates the JWT with Supabase rather than trusting a
    // possibly-stale cookie — the recommended check on the server
    // (https://supabase.com/docs/guides/auth/server-side/nextjs, same
    // guidance applies to any SSR framework). getSession() afterwards then
    // reads the (now-refreshed-if-needed) session for its expiry.
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return null;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return null;
    return toSession(userData.user, new Date(sessionData.session.expires_at! * 1000).toISOString());
  }

  onSessionChange(handler: (session: Session | null) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const {
      data: { subscription },
    } = this.getClient().auth.onAuthStateChange((_event, session) => {
      handler(session?.user ? toSession(session.user, new Date(session.expires_at! * 1000).toISOString()) : null);
    });
    return () => subscription.unsubscribe();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const appUrl = process.env["PUBLIC_APP_URL"] ?? "http://localhost:3000";
    // Supabase itself never reveals whether the email exists — same
    // no-op-looking success either way, matching LocalAuthProvider's
    // documented behaviour.
    await this.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });
  }

  async resetPassword(input: { token: string; newPassword: string }): Promise<AuthResult> {
    const client = this.getClient();
    // input.token is the PKCE `code` from the recovery link (see class
    // doc comment). Exchanging it establishes the recovery session that
    // updateUser then acts on.
    const { data, error } = await client.auth.exchangeCodeForSession(input.token);
    if (error || !data.session || !data.user) {
      return { ok: false, code: "invalid_or_expired_token" };
    }
    const { error: updateError } = await client.auth.updateUser({ password: input.newPassword });
    if (updateError) return { ok: false, code: "invalid_or_expired_token" };
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async verifyEmail(_token: string): Promise<boolean> {
    // No separate token to redeem under this project's settings (class doc
    // comment) — report whatever the current session's real state is.
    const session = await this.getSession();
    if (!session) return false;
    const { data } = await this.getClient().auth.getUser();
    return Boolean(data.user?.email_confirmed_at);
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    const { data } = await this.getClient().auth.getUser();
    // Can only answer for the currently signed-in user via the anon client
    // — every real call site (verify-email.tsx) only ever asks about the
    // active session's own user, never an arbitrary id.
    if (!data.user || data.user.id !== userId) return false;
    return Boolean(data.user.email_confirmed_at);
  }
}
