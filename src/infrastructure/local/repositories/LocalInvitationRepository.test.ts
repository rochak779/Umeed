import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalInvitationRepository } from "./LocalInvitationRepository";
import type { Invitation } from "../../../domain/entities/invitation";

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "inv-1",
    careCircleId: "circle-1",
    invitedByUserId: "sarah",
    invitedEmail: "priya@example.com",
    invitedPhone: null,
    proposedResponderType: "nearby_responder",
    proposedRelationship: "neighbour",
    tokenHash: "hash-1",
    status: "pending",
    expiresAt: "2026-02-01T00:00:00.000Z",
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LocalInvitationRepository", () => {
  it("finds an invitation by its token hash, never by plaintext", async () => {
    const repo = new LocalInvitationRepository(new InMemoryKeyValueStore());
    await repo.save(makeInvitation());
    expect((await repo.findByTokenHash("hash-1"))?.id).toBe("inv-1");
    expect(await repo.findByTokenHash("wrong-hash")).toBeNull();
  });

  it("lists invitations for a care circle", async () => {
    const repo = new LocalInvitationRepository(new InMemoryKeyValueStore());
    await repo.save(makeInvitation({ id: "inv-1", careCircleId: "circle-1" }));
    await repo.save(makeInvitation({ id: "inv-2", careCircleId: "circle-2" }));
    expect((await repo.findByCareCircle("circle-1")).map((i) => i.id)).toEqual(["inv-1"]);
  });
});
