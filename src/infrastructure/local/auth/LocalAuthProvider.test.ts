import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { FakeClock } from "../../../shared/time/Clock";
import { LocalAuthProvider } from "./LocalAuthProvider";

function makeProvider(clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"))) {
  return new LocalAuthProvider(new InMemoryKeyValueStore(), clock);
}

describe("LocalAuthProvider.register", () => {
  it("creates an account and returns a session", async () => {
    const auth = makeProvider();
    const result = await auth.register({
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "correct-horse",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.email).toBe("sarah@example.com");
  });

  it("rejects a second registration with the same email", async () => {
    const auth = makeProvider();
    await auth.register({ displayName: "Sarah", email: "sarah@example.com", password: "pw" });
    const result = await auth.register({
      displayName: "Sarah 2",
      email: "sarah@example.com",
      password: "pw2",
    });
    expect(result).toEqual({ ok: false, code: "email_taken" });
  });

  it("a newly registered account starts with email unverified", async () => {
    const auth = makeProvider();
    const result = await auth.register({
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "pw",
    });
    if (!result.ok) throw new Error("expected success");
    expect(await auth.isEmailVerified(result.session.userId)).toBe(false);
  });
});

describe("LocalAuthProvider.signIn / signOut", () => {
  it("signs in with the correct password", async () => {
    const auth = makeProvider();
    await auth.register({
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "correct-horse",
    });
    const result = await auth.signIn({ email: "sarah@example.com", password: "correct-horse" });
    expect(result.ok).toBe(true);
  });

  it("rejects an incorrect password without revealing which part was wrong", async () => {
    const auth = makeProvider();
    await auth.register({
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "correct-horse",
    });
    const result = await auth.signIn({ email: "sarah@example.com", password: "wrong" });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("rejects sign-in for an unknown email with the same code as a wrong password", async () => {
    const auth = makeProvider();
    const result = await auth.signIn({ email: "nobody@example.com", password: "whatever" });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("clears the session on sign out", async () => {
    const auth = makeProvider();
    await auth.register({ displayName: "Sarah", email: "sarah@example.com", password: "pw" });
    expect(await auth.getSession()).not.toBeNull();
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });
});

describe("LocalAuthProvider session restoration", () => {
  it("restores the session from the same underlying store after a simulated refresh", async () => {
    const store = new InMemoryKeyValueStore();
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const first = new LocalAuthProvider(store, clock);
    await first.register({ displayName: "Sarah", email: "sarah@example.com", password: "pw" });

    const second = new LocalAuthProvider(store, clock);
    const session = await second.getSession();
    expect(session?.email).toBe("sarah@example.com");
  });

  it("does not restore an expired session", async () => {
    const store = new InMemoryKeyValueStore();
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const auth = new LocalAuthProvider(store, clock);
    await auth.register({ displayName: "Sarah", email: "sarah@example.com", password: "pw" });

    clock.advanceMs(1000 * 60 * 60 * 24 * 365); // well past session expiry

    expect(await auth.getSession()).toBeNull();
  });
});

describe("LocalAuthProvider password reset", () => {
  it("lets a user reset their password with a valid token, then sign in with the new password", async () => {
    const auth = makeProvider();
    await auth.register({ displayName: "Sarah", email: "sarah@example.com", password: "old-pw" });
    const token = await auth.__test__issueResetToken("sarah@example.com");

    const result = await auth.resetPassword({ token, newPassword: "new-pw" });
    expect(result.ok).toBe(true);

    expect((await auth.signIn({ email: "sarah@example.com", password: "old-pw" })).ok).toBe(false);
    expect((await auth.signIn({ email: "sarah@example.com", password: "new-pw" })).ok).toBe(true);
  });

  it("rejects an unknown reset token", async () => {
    const auth = makeProvider();
    const result = await auth.resetPassword({ token: "bogus", newPassword: "new-pw" });
    expect(result).toEqual({ ok: false, code: "invalid_or_expired_token" });
  });

  it("rejects an expired reset token", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const auth = makeProvider(clock);
    await auth.register({ displayName: "Sarah", email: "sarah@example.com", password: "old-pw" });
    const token = await auth.__test__issueResetToken("sarah@example.com");

    clock.advanceMs(1000 * 60 * 60 * 24); // past the reset window

    const result = await auth.resetPassword({ token, newPassword: "new-pw" });
    expect(result).toEqual({ ok: false, code: "invalid_or_expired_token" });
  });
});

describe("LocalAuthProvider email verification", () => {
  it("marks the account verified with a valid token", async () => {
    const auth = makeProvider();
    const registered = await auth.register({
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "pw",
    });
    if (!registered.ok) throw new Error("expected success");
    const token = await auth.__test__issueVerificationToken("sarah@example.com");

    expect(await auth.verifyEmail(token)).toBe(true);
    expect(await auth.isEmailVerified(registered.session.userId)).toBe(true);
  });

  it("rejects an unknown verification token", async () => {
    const auth = makeProvider();
    expect(await auth.verifyEmail("bogus")).toBe(false);
  });
});
