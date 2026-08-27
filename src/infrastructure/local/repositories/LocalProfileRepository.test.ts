import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalProfileRepository } from "./LocalProfileRepository";
import type { UserProfile } from "../../../domain/entities/profile";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    displayName: "Sarah",
    preferredName: "Sarah",
    phone: null,
    address: null,
    email: "sarah@example.com",
    timezone: "Europe/London",
    locale: "en-GB",
    accessibilityPreferences: { largeText: false, reducedMotion: false, highContrast: false },
    onboardingStatus: "not_started",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LocalProfileRepository", () => {
  it("finds a saved profile by id", async () => {
    const repo = new LocalProfileRepository(new InMemoryKeyValueStore());
    await repo.save(makeProfile());
    expect((await repo.findById("user-1"))?.displayName).toBe("Sarah");
  });

  it("finds a profile by email, case-insensitively", async () => {
    const repo = new LocalProfileRepository(new InMemoryKeyValueStore());
    await repo.save(makeProfile({ email: "Sarah@Example.com" }));
    expect((await repo.findByEmail("sarah@example.com"))?.id).toBe("user-1");
  });

  it("returns null for an unknown id or email", async () => {
    const repo = new LocalProfileRepository(new InMemoryKeyValueStore());
    expect(await repo.findById("missing")).toBeNull();
    expect(await repo.findByEmail("missing@example.com")).toBeNull();
  });
});
