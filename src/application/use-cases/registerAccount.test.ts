import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalAuthProvider } from "../../infrastructure/local/auth/LocalAuthProvider";
import { LocalProfileRepository } from "../../infrastructure/local/repositories/LocalProfileRepository";
import { FakeClock } from "../../shared/time/Clock";
import { registerAccount } from "./registerAccount";

function makeDeps() {
  const store = new InMemoryKeyValueStore();
  const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
  return {
    authProvider: new LocalAuthProvider(store, clock),
    profileRepository: new LocalProfileRepository(store),
    clock,
  };
}

describe("registerAccount", () => {
  it("creates an auth account and a matching UserProfile with the same id", async () => {
    const deps = makeDeps();
    const result = await registerAccount(deps, {
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "correct-horse",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const profile = await deps.profileRepository.findById(result.session.userId);
    expect(profile?.displayName).toBe("Sarah");
    expect(profile?.preferredName).toBe("Sarah");
    expect(profile?.onboardingStatus).toBe("not_started");
  });

  it("propagates an email_taken failure without creating a profile", async () => {
    const deps = makeDeps();
    await registerAccount(deps, {
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "pw",
    });
    const second = await registerAccount(deps, {
      displayName: "Sarah 2",
      email: "sarah@example.com",
      password: "pw2",
    });
    expect(second).toEqual({ ok: false, code: "email_taken" });
  });
});
