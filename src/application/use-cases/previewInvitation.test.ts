import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalCareCircleRepository } from "../../infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "../../infrastructure/local/repositories/LocalInvitationRepository";
import { LocalProfileRepository } from "../../infrastructure/local/repositories/LocalProfileRepository";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { startCareCircle } from "./startCareCircle";
import { previewInvitation } from "./previewInvitation";
import { buildUserProfile } from "../../../test/builders/entities";

function makeDeps(clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"))) {
  const store = new InMemoryKeyValueStore();
  return {
    careCircleRepository: new LocalCareCircleRepository(store),
    invitationRepository: new LocalInvitationRepository(store),
    profileRepository: new LocalProfileRepository(store),
    auditRepository: new LocalAuditRepository(store),
    clock,
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("previewInvitation", () => {
  it("returns the circle and inviter for a valid invitation", async () => {
    const deps = makeDeps();
    await deps.profileRepository.save(
      buildUserProfile({ id: "sarah", displayName: "Sarah", preferredName: "Sarah" }),
    );
    const { plaintextToken, circle } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    const result = await previewInvitation(deps, { token: plaintextToken });

    expect(result).toEqual({
      ok: true,
      circleName: circle.name,
      inviterName: "Sarah",
      proposedResponderType: "older_adult",
      invitedEmail: "margaret@example.com",
    });
  });

  it("rejects an unknown token", async () => {
    const deps = makeDeps();
    expect(await previewInvitation(deps, { token: "bogus" })).toEqual({
      ok: false,
      code: "invalid_token",
    });
  });

  it("rejects an expired invitation", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const deps = makeDeps(clock);
    const { plaintextToken } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });
    clock.advanceMs(1000 * 60 * 60 * 24 * 30);
    expect(await previewInvitation(deps, { token: plaintextToken })).toEqual({
      ok: false,
      code: "expired",
    });
  });
});
