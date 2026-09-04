import { describe, expect, it } from "vitest";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/client";
import { SupabaseAuthProvider } from "./SupabaseAuthProvider";

const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) && Boolean(process.env["SUPABASE_ANON_KEY"]);

function makeProvider() {
  const client = createSupabaseAnonClient();
  return new SupabaseAuthProvider(() => client);
}

function uniqueEmail(): string {
  return `test-${crypto.randomUUID()}@example.invalid`;
}

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider.register", () => {
  it("creates an account and returns an active session immediately", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    const result = await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.email).toBe(email);
  });

  it("rejects a second registration with the same email", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.register({ displayName: "Sarah 2", email, password: "correct-horse-2" });
    expect(result).toEqual({ ok: false, code: "email_taken" });
  });
});

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider.signIn / signOut", () => {
  it("signs in with the correct password", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.signIn({ email, password: "correct-horse-1" });
    expect(result.ok).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.signIn({ email, password: "wrong-password" });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("clears the session on sign out", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    expect(await auth.getSession()).not.toBeNull();
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });
});

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider password reset", () => {
  it("requestPasswordReset never reveals whether the email exists", async () => {
    const auth = makeProvider();
    await expect(auth.requestPasswordReset("nobody-here@example.invalid")).resolves.toBeUndefined();
  });
});
