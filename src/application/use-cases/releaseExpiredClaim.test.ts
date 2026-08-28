import { describe, expect, it, vi } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { releaseExpiredClaim } from "./releaseExpiredClaim";
import { buildAlert, buildOccurrence } from "../../../test/builders/entities";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>, nowUtc: string) {
  return {
    alerts: repos.alerts,
    occurrences: repos.occurrences,
    routines: repos.routines,
    careCircles: repos.careCircles,
    audit: repos.audit,
    communications: { findByIdempotencyKey: async () => null, save: async () => {} },
    notificationGateway: {
      send: async () => ({ providerReference: "ref", status: "sent" as const }),
    },
    clock: new FakeClock(new Date(nowUtc)),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("releaseExpiredClaim", () => {
  it("releases a claim past its expiry and resumes escalation at the next stage", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
        claimedAt: "2026-01-05T09:35:00.000Z",
        claimExpiresAt: "2026-01-05T09:50:00.000Z",
        currentStage: 1,
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:51:00.000Z");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: true });
    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("unclaimed");
    expect(alert?.claimedBy).toBeNull();
    expect(alert?.currentStage).toBe(2);
  });

  it("does nothing before the claim has actually expired", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
        claimExpiresAt: "2026-01-05T09:50:00.000Z",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:40:00.000Z");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: false });
    expect((await repos.alerts.findById("alert-1"))?.status).toBe("claimed");
  });

  it("records an audit event when a claim actually expires", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
        claimExpiresAt: "2026-01-05T09:50:00.000Z",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:51:00.000Z");

    await releaseExpiredClaim(deps, { alertId: "alert-1" });

    const events = await repos.audit.findByCareCircle("circle-margaret");
    expect(events.some((e) => e.action === "alert.claim_expired")).toBe(true);
  });

  it("does nothing for an alert that isn't currently claimed", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({ id: "alert-1", careCircleId: "circle-margaret", status: "unclaimed" }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:51:00.000Z");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: false });
  });
});

describe("releaseExpiredClaim — escalation continuation", () => {
  it("notifies the next escalation stage's recipients after a claim expires", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { routine, circle } = await seedMargaretScenario(repos);
    const occurrence = buildOccurrence({
      id: "occ-1",
      routineId: routine.id,
      scheduledForUtc: "2026-01-05T09:00:00.000Z",
      scheduledLocalDate: "2026-01-05",
      status: "missed",
    });
    await repos.occurrences.save(occurrence);
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: circle.id,
        occurrenceId: occurrence.id,
        status: "claimed",
        claimedBy: "member-priya",
        claimedAt: "2026-01-05T09:35:00.000Z",
        claimExpiresAt: "2026-01-05T09:50:00.000Z",
        currentStage: 1,
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:51:00.000Z");
    const saveRecipientSpy = vi.spyOn(deps.alerts, "saveRecipient");
    const sendSpy = vi.spyOn(deps.notificationGateway, "send");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: true });
    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("unclaimed");
    expect(alert?.currentStage).toBe(2);

    const recipients = await repos.alerts.findRecipients("alert-1");
    const coordinatorRecipient = recipients.find((r) => r.circleMemberId === "member-sarah");
    expect(coordinatorRecipient).toBeDefined();
    expect(coordinatorRecipient?.stage).toBe(2);
    expect(
      saveRecipientSpy.mock.calls.some(
        ([r]) => r.circleMemberId === "member-sarah" && r.stage === 2,
      ),
    ).toBe(true);
    expect(sendSpy).toHaveBeenCalled();
  });

  it("marks the alert unresolved when the escalation sequence is exhausted", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { routine, circle } = await seedMargaretScenario(repos);
    const occurrence = buildOccurrence({
      id: "occ-1",
      routineId: routine.id,
      scheduledForUtc: "2026-01-05T09:00:00.000Z",
      scheduledLocalDate: "2026-01-05",
      status: "missed",
    });
    await repos.occurrences.save(occurrence);
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: circle.id,
        occurrenceId: occurrence.id,
        status: "claimed",
        claimedBy: "member-sarah",
        claimedAt: "2026-01-05T10:00:00.000Z",
        claimExpiresAt: "2026-01-05T10:15:00.000Z",
        currentStage: 2,
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T10:16:00.000Z");
    const auditAppendSpy = vi.spyOn(deps.audit, "append");
    const alertsSaveSpy = vi.spyOn(deps.alerts, "save");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: true });
    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("unresolved");
    expect(alertsSaveSpy.mock.calls.some(([a]) => a.status === "unresolved")).toBe(true);
    expect(auditAppendSpy.mock.calls.some(([e]) => e.action === "alert.unresolved")).toBe(true);
  });

  it("direct-help alerts (no occurrenceId) release the claim without further escalation", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: circle.id,
        occurrenceId: null,
        source: "direct_help",
        status: "claimed",
        claimedBy: "member-priya",
        claimedAt: "2026-01-05T09:35:00.000Z",
        claimExpiresAt: "2026-01-05T09:50:00.000Z",
        currentStage: 1,
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:51:00.000Z");

    const result = await releaseExpiredClaim(deps, { alertId: "alert-1" });

    expect(result).toEqual({ ok: true, released: true });
    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("unclaimed");
    expect(alert?.currentStage).toBe(2);
  });
});
