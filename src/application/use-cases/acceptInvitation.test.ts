import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalCareCircleRepository } from "../../infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "../../infrastructure/local/repositories/LocalInvitationRepository";
import { LocalConsentRepository } from "../../infrastructure/local/repositories/LocalConsentRepository";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { LocalRoutineRepository } from "../../infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../infrastructure/local/repositories/LocalOccurrenceRepository";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { hashToken } from "../../shared/token/hashToken";
import { startCareCircle } from "./startCareCircle";
import { acceptInvitation } from "./acceptInvitation";
import { createRoutine } from "./createRoutine";
import { buildInvitation } from "../../../test/builders/entities";

function makeDeps(clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"))) {
  const store = new InMemoryKeyValueStore();
  return {
    careCircleRepository: new LocalCareCircleRepository(store),
    invitationRepository: new LocalInvitationRepository(store),
    consentRepository: new LocalConsentRepository(store),
    auditRepository: new LocalAuditRepository(store),
    routineRepository: new LocalRoutineRepository(store),
    occurrenceRepository: new LocalOccurrenceRepository(store),
    clock,
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("acceptInvitation — older adult", () => {
  it("activates the circle, adds the older adult as an active member, and records consent", async () => {
    const deps = makeDeps();
    const { plaintextToken, circle } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "margaret",
      userEmail: "margaret@example.com",
    });

    expect(result).toEqual({ ok: true });

    const updatedCircle = await deps.careCircleRepository.findById(circle.id);
    expect(updatedCircle?.status).toBe("active");
    expect(updatedCircle?.olderAdultId).toBe("margaret");

    const member = await deps.careCircleRepository.findMemberByUserAndCircle("margaret", circle.id);
    expect(member?.responderType).toBe("older_adult");
    expect(member?.membershipStatus).toBe("active");

    const consents = await deps.consentRepository.findByCareCircle(circle.id);
    expect(
      consents.some((c) => c.consentType === "circle_participation" && c.status === "granted"),
    ).toBe(true);
  });
});

describe("acceptInvitation — routines set up before consent", () => {
  it("attaches the older adult to existing routines and cancels times that passed while waiting", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const deps = makeDeps(clock);
    const { plaintextToken, circle } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    const routine = await createRoutine(
      {
        careCircles: deps.careCircleRepository,
        routines: deps.routineRepository,
        occurrences: deps.occurrenceRepository,
        audit: deps.auditRepository,
        clock,
        idGenerator: deps.idGenerator,
      },
      {
        actorUserId: "sarah",
        careCircleId: circle.id,
        olderAdultId: null,
        type: "medication",
        title: "Morning tablets",
        description: null,
        timezone: "Europe/London",
        localTime: "09:00",
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: "2026-01-01",
        endDate: null,
        gracePeriodMinutes: 30,
      },
    );
    expect(routine.olderAdultId).toBeNull();

    // Margaret accepts three days later — three 09:00 slots have passed.
    clock.advanceMs(3 * 24 * 60 * 60 * 1000);
    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "margaret",
      userEmail: "margaret@example.com",
    });
    expect(result).toEqual({ ok: true });

    const updatedRoutine = await deps.routineRepository.findById(routine.id);
    expect(updatedRoutine?.olderAdultId).toBe("margaret");

    const nowIso = clock.now().toISOString();
    const occurrences = await deps.occurrenceRepository.findByRoutine(routine.id);
    const past = occurrences.filter((o) => o.scheduledForUtc <= nowIso);
    const future = occurrences.filter((o) => o.scheduledForUtc > nowIso);
    expect(past.length).toBe(3);
    expect(past.every((o) => o.status === "cancelled")).toBe(true);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((o) => o.status === "scheduled")).toBe(true);
  });
});

describe("acceptInvitation — family / nearby responder", () => {
  it("adds the invitee as an active member without touching circle status", async () => {
    const deps = makeDeps();
    const invitation = buildInvitation({
      id: "inv-1",
      careCircleId: "circle-1",
      proposedResponderType: "nearby_responder",
      proposedRelationship: "neighbour",
      invitedEmail: "priya@example.com",
      tokenHash: hashToken("priya-token"),
    });
    await deps.invitationRepository.save(invitation);
    await deps.careCircleRepository.save({
      id: "circle-1",
      name: "Margaret's circle",
      olderAdultId: "margaret",
      coordinatorId: "sarah",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await acceptInvitation(deps, {
      token: "priya-token",
      userId: "priya",
      userEmail: "priya@example.com",
    });

    expect(result).toEqual({ ok: true });
    const member = await deps.careCircleRepository.findMemberByUserAndCircle("priya", "circle-1");
    expect(member?.responderType).toBe("nearby_responder");
    expect(member?.isNearby).toBe(true);
  });
});

describe("acceptInvitation — rejections", () => {
  it("rejects an unknown token", async () => {
    const deps = makeDeps();
    const result = await acceptInvitation(deps, {
      token: "bogus",
      userId: "margaret",
      userEmail: "margaret@example.com",
    });
    expect(result).toEqual({ ok: false, code: "invalid_token" });
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

    clock.advanceMs(1000 * 60 * 60 * 24 * 30); // well past the 7-day expiry

    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "margaret",
      userEmail: "margaret@example.com",
    });
    expect(result).toEqual({ ok: false, code: "expired" });
  });

  it("rejects a revoked invitation", async () => {
    const deps = makeDeps();
    const { plaintextToken, invitation } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });
    await deps.invitationRepository.save({
      ...invitation,
      status: "revoked",
      revokedAt: "2026-01-02T00:00:00.000Z",
    });

    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "margaret",
      userEmail: "margaret@example.com",
    });
    expect(result).toEqual({ ok: false, code: "revoked" });
  });

  it("rejects an already-accepted invitation", async () => {
    const deps = makeDeps();
    const { plaintextToken } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });
    await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "margaret",
      userEmail: "margaret@example.com",
    });

    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "someone-else",
      userEmail: "someone-else@example.com",
    });
    expect(result).toEqual({ ok: false, code: "already_used" });
  });

  it("rejects when the invitation was addressed to a different email than the signed-in account", async () => {
    const deps = makeDeps();
    const { plaintextToken } = await startCareCircle(deps, {
      coordinatorUserId: "sarah",
      olderAdultPreferredName: "Margaret",
      invitedEmail: "margaret@example.com",
      invitedPhone: null,
    });

    const result = await acceptInvitation(deps, {
      token: plaintextToken,
      userId: "someone-else",
      userEmail: "someone-else@example.com",
    });
    expect(result).toEqual({ ok: false, code: "wrong_account" });
  });
});
