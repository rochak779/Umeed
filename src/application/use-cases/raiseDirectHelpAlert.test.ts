import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { raiseDirectHelpAlert } from "./raiseDirectHelpAlert";
import { PermissionDeniedError } from "../../domain/errors/DomainError";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  return {
    careCircles: repos.careCircles,
    alerts: repos.alerts,
    audit: repos.audit,
    communications: { findByIdempotencyKey: async () => null, save: async () => {} },
    notificationGateway: {
      send: async () => ({ providerReference: "ref", status: "sent" as const }),
    },
    clock: new FakeClock(new Date("2026-01-05T14:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("raiseDirectHelpAlert", () => {
  it("opens an immediately unclaimed direct-help alert with no occurrence", async () => {
    const repos = buildMargaretScenarioRepositories();
    await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    const result = await raiseDirectHelpAlert(deps, { olderAdultUserId: "margaret" });

    expect(result.ok).toBe(true);
    const alerts = await repos.alerts.findOpenByCareCircle("circle-margaret");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.source).toBe("direct_help");
    expect(alerts[0]?.status).toBe("unclaimed");
    expect(alerts[0]?.occurrenceId).toBeNull();
    expect(alerts[0]?.severity).toBe("urgent");
  });

  it("notifies the coordinator and nearby responder immediately, skipping any reminder stage", async () => {
    const repos = buildMargaretScenarioRepositories();
    await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await raiseDirectHelpAlert(deps, { olderAdultUserId: "margaret" });

    const [alert] = await repos.alerts.findOpenByCareCircle("circle-margaret");
    const recipients = await repos.alerts.findRecipients(alert!.id);
    const memberIds = await Promise.all(
      recipients.map(
        async (r) => (await repos.careCircles.findMemberById(r.circleMemberId))?.userId,
      ),
    );
    expect(memberIds).toContain("sarah");
    expect(memberIds).toContain("priya");
  });

  it("rejects a request from someone other than the circle's older adult", async () => {
    const repos = buildMargaretScenarioRepositories();
    await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(raiseDirectHelpAlert(deps, { olderAdultUserId: "sarah" })).rejects.toThrow(
      PermissionDeniedError,
    );
  });

  it("dispatches notifications and marks recipients as sent", async () => {
    const repos = buildMargaretScenarioRepositories();
    await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await raiseDirectHelpAlert(deps, { olderAdultUserId: "margaret" });

    const [alert] = await repos.alerts.findOpenByCareCircle("circle-margaret");
    const recipients = await repos.alerts.findRecipients(alert!.id);
    expect(recipients.length).toBeGreaterThan(0);
    for (const recipient of recipients) {
      expect(recipient.deliveryStatus).toBe("sent");
    }
  });
});
