import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { claimAlert } from "./claimAlert";
import { buildAlert } from "../../../test/builders/entities";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>, nowUtc: string) {
  return {
    alerts: repos.alerts,
    careCircles: repos.careCircles,
    audit: repos.audit,
    clock: new FakeClock(new Date(nowUtc)),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("claimAlert", () => {
  it("lets an eligible member claim an unclaimed alert, with a claim expiry", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    await repos.alerts.save(
      buildAlert({ id: "alert-1", careCircleId: circle.id, status: "unclaimed" }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:35:00.000Z");

    const result = await claimAlert(deps, {
      alertId: "alert-1",
      claimerUserId: "priya",
      claimWindowMinutes: 15,
    });

    expect(result).toEqual({ ok: true });
    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("claimed");
    expect(alert?.claimedBy).toBe("priya");
    expect(alert?.claimExpiresAt).toBe("2026-01-05T09:50:00.000Z");
  });

  it("only one of two simultaneous claims wins; the loser gets a friendly 'already handling' message", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    await repos.alerts.save(
      buildAlert({ id: "alert-1", careCircleId: circle.id, status: "unclaimed" }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:35:00.000Z");

    const [first, second] = await Promise.all([
      claimAlert(deps, { alertId: "alert-1", claimerUserId: "priya", claimWindowMinutes: 15 }),
      claimAlert(deps, { alertId: "alert-1", claimerUserId: "sarah", claimWindowMinutes: 15 }),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok);
    expect(loser).toMatchObject({ ok: false, reason: "already_claimed" });
  });

  it("rejects claiming a resolved alert", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    await repos.alerts.save(
      buildAlert({ id: "alert-1", careCircleId: circle.id, status: "resolved" }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:35:00.000Z");

    const result = await claimAlert(deps, {
      alertId: "alert-1",
      claimerUserId: "priya",
      claimWindowMinutes: 15,
    });

    expect(result.ok).toBe(false);
  });

  it("writes an audit event for a successful claim", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    await repos.alerts.save(
      buildAlert({ id: "alert-1", careCircleId: circle.id, status: "unclaimed" }),
    );
    const deps = makeDeps(repos, "2026-01-05T09:35:00.000Z");

    await claimAlert(deps, { alertId: "alert-1", claimerUserId: "priya", claimWindowMinutes: 15 });

    const events = await repos.audit.findByCareCircle(circle.id);
    expect(events.some((e) => e.action === "alert.claimed")).toBe(true);
  });
});
