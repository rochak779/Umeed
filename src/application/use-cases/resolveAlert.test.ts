import { describe, expect, it } from "vitest";
import { buildMargaretScenarioRepositories } from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { resolveAlert } from "./resolveAlert";
import { buildAlert, buildOccurrence } from "../../../test/builders/entities";
import { PermissionDeniedError } from "../../domain/errors/DomainError";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>, nowUtc: string) {
  return {
    alerts: repos.alerts,
    occurrences: repos.occurrences,
    audit: repos.audit,
    clock: new FakeClock(new Date(nowUtc)),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("resolveAlert", () => {
  it("lets the claimant resolve the alert they're holding", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T10:00:00.000Z");

    await resolveAlert(deps, {
      alertId: "alert-1",
      actorUserId: "priya",
      resolutionCode: "checked_in_person_all_okay",
      resolutionNote: "Spoke to Margaret — she is okay.",
    });

    const alert = await repos.alerts.findById("alert-1");
    expect(alert?.status).toBe("resolved");
    expect(alert?.resolvedBy).toBe("priya");
    expect(alert?.resolutionCode).toBe("checked_in_person_all_okay");
  });

  it("marks the missed routine slot resolved, so it stops showing as her next routine", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.occurrences.save(buildOccurrence({ id: "occ-1", status: "missed" }));
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        occurrenceId: "occ-1",
        status: "claimed",
        claimedBy: "priya",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T10:00:00.000Z");

    await resolveAlert(deps, {
      alertId: "alert-1",
      actorUserId: "priya",
      resolutionCode: "spoke_all_okay",
      resolutionNote: null,
    });

    const occurrence = await repos.occurrences.findById("occ-1");
    expect(occurrence?.status).toBe("resolved");
  });

  it("rejects resolution from someone other than the claimant", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T10:00:00.000Z");

    await expect(
      resolveAlert(deps, {
        alertId: "alert-1",
        actorUserId: "sarah",
        resolutionCode: "spoke_all_okay",
        resolutionNote: null,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("records an audit event on resolution", async () => {
    const repos = buildMargaretScenarioRepositories();
    await repos.alerts.save(
      buildAlert({
        id: "alert-1",
        careCircleId: "circle-margaret",
        status: "claimed",
        claimedBy: "priya",
      }),
    );
    const deps = makeDeps(repos, "2026-01-05T10:00:00.000Z");

    await resolveAlert(deps, {
      alertId: "alert-1",
      actorUserId: "priya",
      resolutionCode: "spoke_all_okay",
      resolutionNote: null,
    });

    const events = await repos.audit.findByCareCircle("circle-margaret");
    expect(events.some((e) => e.action === "alert.resolved")).toBe(true);
  });
});
