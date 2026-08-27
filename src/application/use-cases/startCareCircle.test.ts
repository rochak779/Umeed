import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalCareCircleRepository } from "../../infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "../../infrastructure/local/repositories/LocalInvitationRepository";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { startCareCircle } from "./startCareCircle";

function makeDeps() {
  const store = new InMemoryKeyValueStore();
  return {
    careCircleRepository: new LocalCareCircleRepository(store),
    invitationRepository: new LocalInvitationRepository(store),
    auditRepository: new LocalAuditRepository(store),
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("startCareCircle", () => {
  it("creates a pending_consent circle with the coordinator as an active member", async () => {
    const deps = makeDeps();
    const { circle } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    expect(circle.status).toBe("pending_consent");
    expect(circle.olderAdultId).toBeNull();
    expect(circle.coordinatorId).toBe("sarah");

    const members = await deps.careCircleRepository.findMembers(circle.id);
    expect(members).toHaveLength(1);
    expect(members[0]?.responderType).toBe("coordinator");
    expect(members[0]?.membershipStatus).toBe("active");
  });

  it("creates a pending invitation addressed to the older adult, with only a hash persisted", async () => {
    const deps = makeDeps();
    const { circle, plaintextToken } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    const invitations = await deps.invitationRepository.findByCareCircle(circle.id);
    expect(invitations).toHaveLength(1);
    expect(invitations[0]?.proposedResponderType).toBe("older_adult");
    expect(invitations[0]?.status).toBe("pending");
    expect(invitations[0]?.tokenHash).not.toBe(plaintextToken);
    expect(JSON.stringify(invitations[0])).not.toContain(plaintextToken);
  });

  it("records an audit event for circle creation", async () => {
    const deps = makeDeps();
    const { circle } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });
    const events = await deps.auditRepository.findByCareCircle(circle.id);
    expect(events.some((e) => e.action === "care_circle.created")).toBe(true);
  });
});
