import { describe, expect, it } from "vitest";
import { buildMargaretScenarioRepositories } from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { releaseExpiredClaim } from "./releaseExpiredClaim";
import { buildAlert } from "../../../test/builders/entities";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>, nowUtc: string) {
  return {
    alerts: repos.alerts,
    audit: repos.audit,
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
