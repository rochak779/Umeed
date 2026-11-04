import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAuthProvider } from "./SupabaseAuthProvider";

function providerWith(auth: Record<string, unknown>) {
  return new SupabaseAuthProvider(() => ({ auth }) as unknown as SupabaseClient);
}

describe("SupabaseAuthProvider when the project requires email confirmation", () => {
  it("reports confirmation_required when sign-up creates a user but no session", async () => {
    const auth = providerWith({
      signUp: async () => ({
        data: { user: { id: "u-1", email: "a@example.test" }, session: null },
        error: null,
      }),
    });
    const result = await auth.register({
      displayName: "A",
      email: "a@example.test",
      password: "pw-123456",
    });
    expect(result).toEqual({ ok: false, code: "confirmation_required" });
  });

  it("reports email_not_confirmed when sign-in is refused for an unconfirmed email", async () => {
    const auth = providerWith({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { code: "email_not_confirmed", message: "Email not confirmed" },
      }),
    });
    const result = await auth.signIn({ email: "a@example.test", password: "pw-123456" });
    expect(result).toEqual({ ok: false, code: "email_not_confirmed" });
  });

  it("still reports invalid_credentials for a wrong password", async () => {
    const auth = providerWith({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      }),
    });
    const result = await auth.signIn({ email: "a@example.test", password: "wrong" });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });
});
