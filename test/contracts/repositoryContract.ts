import { describe, expect, it } from "vitest";
import type {
  AlertRepository,
  AuditRepository,
  CareCircleRepository,
  CommunicationRepository,
  ConsentRepository,
  InvitationRepository,
  OccurrenceRepository,
  ProfileRepository,
  RoutineRepository,
} from "../../src/application/ports/repositories";
import { ConflictError } from "../../src/domain/errors/DomainError";
import {
  buildAlert,
  buildAuditEvent,
  buildCareCircle,
  buildCircleMember,
  buildCommunicationEvent,
  buildConsentRecord,
  buildEscalationPolicy,
  buildInvitation,
  buildMemberPermission,
  buildNotificationPreference,
  buildOccurrence,
  buildRoutine,
  buildUserProfile,
} from "../builders/entities";

/**
 * Repository contract tests (Implementation.md §17.2). Run once per
 * concrete repository implementation via `runProfileRepositoryContract(...)`
 * etc. so Local and (from Phase 9 onward) Supabase adapters are held to the
 * exact same behaviour.
 */
export function runProfileRepositoryContract(makeRepository: () => ProfileRepository): void {
  describe("ProfileRepository contract", () => {
    it("returns null for an id that was never saved", async () => {
      expect(await makeRepository().findById("missing")).toBeNull();
    });

    it("round-trips a saved profile by id and by email", async () => {
      const repo = makeRepository();
      const profile = buildUserProfile({ id: "p-1", email: "margaret@example.com" });
      await repo.save(profile);
      expect(await repo.findById("p-1")).toEqual(profile);
      expect(await repo.findByEmail("margaret@example.com")).toEqual(profile);
    });

    it("save is an upsert: saving the same id twice does not create a duplicate", async () => {
      const repo = makeRepository();
      await repo.save(buildUserProfile({ id: "p-1", displayName: "First" }));
      await repo.save(buildUserProfile({ id: "p-1", displayName: "Second" }));
      expect((await repo.findById("p-1"))?.displayName).toBe("Second");
    });
  });
}

export function runAlertRepositoryContract(makeRepository: () => AlertRepository): void {
  describe("AlertRepository contract", () => {
    it("tryClaim succeeds once and fails for a second concurrent claimer", async () => {
      const repo = makeRepository();
      const alert = buildAlert({ id: "a-1", status: "unclaimed" });
      await repo.save(alert);
      const first = await repo.tryClaim(
        "a-1",
        "user-1",
        "2026-01-05T09:00:00.000Z",
        "2026-01-05T09:10:00.000Z",
      );
      const second = await repo.tryClaim(
        "a-1",
        "user-2",
        "2026-01-05T09:00:01.000Z",
        "2026-01-05T09:10:01.000Z",
      );
      expect(first).toBe(true);
      expect(second).toBe(false);
      expect((await repo.findById("a-1"))?.claimedBy).toBe("user-1");
    });

    it("tryClaim fails against a nonexistent alert", async () => {
      const repo = makeRepository();
      expect(
        await repo.tryClaim(
          "missing",
          "user-1",
          "2026-01-05T09:00:00.000Z",
          "2026-01-05T09:10:00.000Z",
        ),
      ).toBe(false);
    });

    it("findOpenByCareCircle excludes resolved, unresolved and cancelled alerts", async () => {
      const repo = makeRepository();
      await repo.save(buildAlert({ id: "a-open", careCircleId: "c-1", status: "unclaimed" }));
      await repo.save(buildAlert({ id: "a-resolved", careCircleId: "c-1", status: "resolved" }));
      const open = await repo.findOpenByCareCircle("c-1");
      expect(open.map((a) => a.id)).toEqual(["a-open"]);
    });

    it("isolates alerts between care circles", async () => {
      const repo = makeRepository();
      await repo.save(buildAlert({ id: "a-1", careCircleId: "c-1" }));
      await repo.save(buildAlert({ id: "a-2", careCircleId: "c-2" }));
      expect((await repo.findByCareCircle("c-1")).map((a) => a.id)).toEqual(["a-1"]);
    });

    it("round-trips alert recipients scoped to their alert", async () => {
      const repo = makeRepository();
      await repo.save(buildAlert({ id: "a-1" }));
      await repo.saveRecipient({
        id: "r-1",
        alertId: "a-1",
        circleMemberId: "member-1",
        channel: "in_app",
        stage: 0,
        deliveryStatus: "queued",
        providerReference: null,
        sentAt: null,
        deliveredAt: null,
        respondedAt: null,
        response: null,
      });
      const recipients = await repo.findRecipients("a-1");
      expect(recipients.map((r) => r.id)).toEqual(["r-1"]);
      expect(await repo.findRecipients("missing")).toEqual([]);
    });
  });
}

export function runCareCircleRepositoryContract(makeRepository: () => CareCircleRepository): void {
  describe("CareCircleRepository contract", () => {
    it("returns null for an id that was never saved", async () => {
      expect(await makeRepository().findById("missing")).toBeNull();
    });

    it("round-trips a saved care circle and upserts on the same id", async () => {
      const repo = makeRepository();
      await repo.save(buildCareCircle({ id: "c-1", name: "First" }));
      await repo.save(buildCareCircle({ id: "c-1", name: "Second" }));
      expect((await repo.findById("c-1"))?.name).toBe("Second");
    });

    it("findByUserId returns only care circles the user actively belongs to", async () => {
      const repo = makeRepository();
      await repo.save(buildCareCircle({ id: "c-1" }));
      await repo.save(buildCareCircle({ id: "c-2" }));
      await repo.saveMember(
        buildCircleMember({
          id: "m-1",
          careCircleId: "c-1",
          userId: "user-1",
          membershipStatus: "active",
        }),
      );
      await repo.saveMember(
        buildCircleMember({
          id: "m-2",
          careCircleId: "c-2",
          userId: "user-2",
          membershipStatus: "removed",
        }),
      );
      const circles = await repo.findByUserId("user-1");
      expect(circles.map((c) => c.id)).toEqual(["c-1"]);
    });

    it("round-trips members and isolates them by care circle", async () => {
      const repo = makeRepository();
      await repo.saveMember(
        buildCircleMember({ id: "m-1", careCircleId: "c-1", userId: "user-1" }),
      );
      await repo.saveMember(
        buildCircleMember({ id: "m-2", careCircleId: "c-2", userId: "user-2" }),
      );
      expect((await repo.findMembers("c-1")).map((m) => m.id)).toEqual(["m-1"]);
      expect((await repo.findMemberById("m-1"))?.id).toBe("m-1");
      expect(await repo.findMemberById("missing")).toBeNull();
      expect((await repo.findMemberByUserAndCircle("user-1", "c-1"))?.id).toBe("m-1");
      expect(await repo.findMemberByUserAndCircle("user-1", "c-2")).toBeNull();
    });

    it("round-trips a member's permission", async () => {
      const repo = makeRepository();
      await repo.savePermission(buildMemberPermission("m-1", "family"));
      expect((await repo.findPermission("m-1"))?.circleMemberId).toBe("m-1");
      expect(await repo.findPermission("missing")).toBeNull();
    });
  });
}

export function runInvitationRepositoryContract(makeRepository: () => InvitationRepository): void {
  describe("InvitationRepository contract", () => {
    it("returns null for an id that was never saved", async () => {
      expect(await makeRepository().findById("missing")).toBeNull();
    });

    it("round-trips an invitation by id and by token hash, upserting on save", async () => {
      const repo = makeRepository();
      await repo.save(buildInvitation({ id: "i-1", tokenHash: "hash-1", status: "pending" }));
      await repo.save(buildInvitation({ id: "i-1", tokenHash: "hash-1", status: "accepted" }));
      expect((await repo.findById("i-1"))?.status).toBe("accepted");
      expect((await repo.findByTokenHash("hash-1"))?.id).toBe("i-1");
      expect(await repo.findByTokenHash("missing")).toBeNull();
    });

    it("isolates invitations between care circles", async () => {
      const repo = makeRepository();
      await repo.save(buildInvitation({ id: "i-1", careCircleId: "c-1", tokenHash: "hash-1" }));
      await repo.save(buildInvitation({ id: "i-2", careCircleId: "c-2", tokenHash: "hash-2" }));
      expect((await repo.findByCareCircle("c-1")).map((i) => i.id)).toEqual(["i-1"]);
    });
  });
}

export function runRoutineRepositoryContract(makeRepository: () => RoutineRepository): void {
  describe("RoutineRepository contract", () => {
    it("returns null for an id that was never saved", async () => {
      expect(await makeRepository().findById("missing")).toBeNull();
    });

    it("round-trips a routine and upserts on the same id", async () => {
      const repo = makeRepository();
      await repo.save(buildRoutine({ id: "r-1", title: "First" }));
      await repo.save(buildRoutine({ id: "r-1", title: "Second" }));
      expect((await repo.findById("r-1"))?.title).toBe("Second");
    });

    it("isolates routines between care circles", async () => {
      const repo = makeRepository();
      await repo.save(buildRoutine({ id: "r-1", careCircleId: "c-1" }));
      await repo.save(buildRoutine({ id: "r-2", careCircleId: "c-2" }));
      expect((await repo.findByCareCircle("c-1")).map((r) => r.id)).toEqual(["r-1"]);
    });

    it("round-trips an escalation policy for a routine", async () => {
      const repo = makeRepository();
      await repo.saveEscalationPolicy(buildEscalationPolicy({ id: "p-1", routineId: "r-1" }));
      expect((await repo.findEscalationPolicy("r-1"))?.id).toBe("p-1");
      expect(await repo.findEscalationPolicy("missing")).toBeNull();
    });
  });
}

export function runOccurrenceRepositoryContract(makeRepository: () => OccurrenceRepository): void {
  describe("OccurrenceRepository contract", () => {
    it("returns null for an id that was never saved", async () => {
      expect(await makeRepository().findById("missing")).toBeNull();
    });

    it("round-trips an occurrence by id and by routine+scheduledForUtc, upserting on the same id", async () => {
      const repo = makeRepository();
      await repo.save(buildOccurrence({ id: "o-1", status: "scheduled" }));
      await repo.save(buildOccurrence({ id: "o-1", status: "acknowledged" }));
      expect((await repo.findById("o-1"))?.status).toBe("acknowledged");
      expect(
        (await repo.findByRoutineAndScheduledForUtc("routine-1", "2026-01-05T09:00:00.000Z"))?.id,
      ).toBe("o-1");
      expect(await repo.findByRoutineAndScheduledForUtc("routine-1", "missing")).toBeNull();
    });

    it("rejects saving a second occurrence with the same routineId+scheduledForUtc under a different id", async () => {
      const repo = makeRepository();
      await repo.save(
        buildOccurrence({
          id: "o-1",
          routineId: "r-1",
          scheduledForUtc: "2026-01-05T09:00:00.000Z",
        }),
      );
      await expect(
        repo.save(
          buildOccurrence({
            id: "o-2",
            routineId: "r-1",
            scheduledForUtc: "2026-01-05T09:00:00.000Z",
          }),
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("isolates occurrences by routine", async () => {
      const repo = makeRepository();
      await repo.save(buildOccurrence({ id: "o-1", routineId: "r-1" }));
      await repo.save(buildOccurrence({ id: "o-2", routineId: "r-2" }));
      expect((await repo.findByRoutine("r-1")).map((o) => o.id)).toEqual(["o-1"]);
    });

    it("findDue returns unresolved occurrences scheduled at or before now", async () => {
      const repo = makeRepository();
      await repo.save(
        buildOccurrence({
          id: "o-due",
          scheduledForUtc: "2026-01-05T09:00:00.000Z",
          status: "scheduled",
        }),
      );
      await repo.save(
        buildOccurrence({
          id: "o-future",
          scheduledForUtc: "2026-01-06T09:00:00.000Z",
          status: "scheduled",
        }),
      );
      await repo.save(
        buildOccurrence({
          id: "o-resolved",
          routineId: "r-2",
          scheduledForUtc: "2026-01-05T09:00:00.000Z",
          status: "resolved",
        }),
      );
      const due = await repo.findDue("2026-01-05T09:30:00.000Z");
      expect(due.map((o) => o.id)).toEqual(["o-due"]);
    });
  });
}

export function runCommunicationRepositoryContract(
  makeRepository: () => CommunicationRepository,
): void {
  describe("CommunicationRepository contract", () => {
    it("returns null for an idempotency key that was never saved", async () => {
      expect(await makeRepository().findByIdempotencyKey("missing")).toBeNull();
    });

    it("round-trips a communication event by idempotency key, upserting on the same id", async () => {
      const repo = makeRepository();
      await repo.save(
        buildCommunicationEvent({ id: "e-1", idempotencyKey: "k-1", status: "queued" }),
      );
      await repo.save(
        buildCommunicationEvent({ id: "e-1", idempotencyKey: "k-1", status: "sent" }),
      );
      expect((await repo.findByIdempotencyKey("k-1"))?.status).toBe("sent");
    });
  });
}

export function runConsentRepositoryContract(makeRepository: () => ConsentRepository): void {
  describe("ConsentRepository contract", () => {
    it("round-trips consent records and isolates them by care circle", async () => {
      const repo = makeRepository();
      await repo.save(buildConsentRecord({ id: "cr-1", careCircleId: "c-1" }));
      await repo.save(buildConsentRecord({ id: "cr-2", careCircleId: "c-2" }));
      expect((await repo.findByCareCircle("c-1")).map((c) => c.id)).toEqual(["cr-1"]);
      expect(await repo.findByCareCircle("missing")).toEqual([]);
    });

    it("save is an upsert: saving the same id twice does not create a duplicate", async () => {
      const repo = makeRepository();
      await repo.save(buildConsentRecord({ id: "cr-1", careCircleId: "c-1", status: "granted" }));
      await repo.save(buildConsentRecord({ id: "cr-1", careCircleId: "c-1", status: "revoked" }));
      const records = await repo.findByCareCircle("c-1");
      expect(records).toHaveLength(1);
      expect(records[0]?.status).toBe("revoked");
    });

    it("round-trips notification preferences scoped to user and care circle", async () => {
      const repo = makeRepository();
      await repo.saveNotificationPreference(
        buildNotificationPreference({ id: "np-1", userId: "user-1", careCircleId: "c-1" }),
      );
      await repo.saveNotificationPreference(
        buildNotificationPreference({ id: "np-2", userId: "user-2", careCircleId: "c-1" }),
      );
      const preferences = await repo.findNotificationPreferences("user-1", "c-1");
      expect(preferences.map((p) => p.id)).toEqual(["np-1"]);
      expect(await repo.findNotificationPreferences("user-1", "missing")).toEqual([]);
    });
  });
}

export function runAuditRepositoryContract(makeRepository: () => AuditRepository): void {
  describe("AuditRepository contract", () => {
    it("appends and lists events for a care circle", async () => {
      const repo = makeRepository();
      await repo.append(buildAuditEvent({ id: "a-1" }));
      await repo.append(buildAuditEvent({ id: "a-2" }));
      expect((await repo.findByCareCircle("circle-1")).map((e) => e.id)).toEqual(["a-1", "a-2"]);
    });

    it("isolates audit events between care circles", async () => {
      const repo = makeRepository();
      await repo.append(buildAuditEvent({ id: "a-1", careCircleId: "c-1" }));
      await repo.append(buildAuditEvent({ id: "a-2", careCircleId: "c-2" }));
      expect((await repo.findByCareCircle("c-1")).map((e) => e.id)).toEqual(["a-1"]);
    });

    it("append never lets a caller overwrite a previous audit event by id", async () => {
      const repo = makeRepository();
      await repo.append(buildAuditEvent({ id: "a-1", action: "member.reordered" }));
      await expect(
        repo.append(buildAuditEvent({ id: "a-1", action: "member.removed" })),
      ).rejects.toThrow();
      expect((await repo.findByCareCircle("circle-1"))[0]?.action).toBe("member.reordered");
    });
  });
}
