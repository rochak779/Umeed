import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { generateOccurrences } from "./generateOccurrences";
import { raiseMissedRoutineAlert } from "./raiseMissedRoutineAlert";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";

async function seedDueOccurrence(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  const { routine } = await seedMargaretScenario(repos);
  await generateOccurrences(
    {
      ...repos,
      idGenerator: new SequentialIdGenerator("occ"),
      clock: new FakeClock(new Date("2026-01-05T00:00:00.000Z")),
    },
    { routineId: routine.id, upToLocalDate: "2026-01-05" },
  );
  const occurrences = await repos.occurrences.findByRoutine(routine.id);
  return occurrences.find((o) => o.scheduledLocalDate === "2026-01-05")!;
}

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>, nowUtc: string) {
  return {
    occurrences: repos.occurrences,
    routines: repos.routines,
    careCircles: repos.careCircles,
    alerts: repos.alerts,
    audit: repos.audit,
    communications: { findByIdempotencyKey: async () => null, save: async () => {} },
    notificationGateway: {
      send: async () => ({ providerReference: "ref", status: "sent" as const }),
    },
    clock: new FakeClock(new Date(nowUtc)),
    idGenerator: new SequentialIdGenerator("alert"),
  };
}

describe("raiseMissedRoutineAlert", () => {
  it("marks the occurrence missed and opens an unclaimed alert once past the grace period", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    // Routine is due 09:00, grace period 30 min -> missed at 09:30.
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result.ok).toBe(true);
    const updated = await repos.occurrences.findById(occurrence.id);
    expect(updated?.status).toBe("missed");

    const alerts = await repos.alerts.findOpenByCareCircle("circle-margaret");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.source).toBe("missed_routine");
    expect(alerts[0]?.status).toBe("unclaimed");
  });

  it("does nothing before the grace period has elapsed", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const deps = makeDeps(repos, "2026-01-05T09:05:00.000Z"); // well within the 30 min grace period

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result).toEqual({ ok: false, reason: "not_yet_due" });
    expect((await repos.occurrences.findById(occurrence.id))?.status).not.toBe("missed");
  });

  it("does nothing if the occurrence was already acknowledged", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    await repos.occurrences.save({ ...occurrence, status: "acknowledged" });
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result).toEqual({ ok: false, reason: "already_resolved" });
  });

  it("does not open a second alert for an occurrence that is already missed/escalating", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });
    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result).toEqual({ ok: false, reason: "already_resolved" });
    expect(await repos.alerts.findOpenByCareCircle("circle-margaret")).toHaveLength(1);
  });

  it("does not open an alert for a disabled routine's occurrence", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const routine = await repos.routines.findById(occurrence.routineId);
    await repos.routines.save({ ...routine!, enabled: false });
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result).toEqual({ ok: false, reason: "routine_paused" });
    expect((await repos.occurrences.findById(occurrence.id))?.status).not.toBe("missed");
    expect(await repos.alerts.findOpenByCareCircle("circle-margaret")).toHaveLength(0);
  });

  it("does not open an alert for a routine whose care circle is paused", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const routine = await repos.routines.findById(occurrence.routineId);
    const circle = await repos.careCircles.findById(routine!.careCircleId);
    await repos.careCircles.save({ ...circle!, status: "paused" });
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result).toEqual({ ok: false, reason: "routine_paused" });
    expect((await repos.occurrences.findById(occurrence.id))?.status).not.toBe("missed");
    expect(await repos.alerts.findOpenByCareCircle("circle-margaret")).toHaveLength(0);
  });

  it("dispatches notifications and marks recipients as sent", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    expect(result.ok).toBe(true);
    const alerts = await repos.alerts.findOpenByCareCircle("circle-margaret");
    const recipients = await repos.alerts.findRecipients(alerts[0]!.id);
    expect(recipients.length).toBeGreaterThan(0);
    for (const recipient of recipients) {
      expect(recipient.deliveryStatus).toBe("sent");
    }
  });

  it("skips to the coordinator when the circle has no nearby responder", async () => {
    const repos = buildMargaretScenarioRepositories();
    const occurrence = await seedDueOccurrence(repos);
    const priya = await repos.careCircles.findMemberByUserAndCircle("priya", "circle-margaret");
    await repos.careCircles.saveMember({ ...priya!, isNearby: false });
    const deps = makeDeps(repos, "2026-01-05T09:31:00.000Z");

    await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });

    const [alert] = await repos.alerts.findOpenByCareCircle("circle-margaret");
    expect(alert?.currentStage).toBe(2);
    const recipients = await repos.alerts.findRecipients(alert!.id);
    expect(recipients.map((r) => r.circleMemberId)).toEqual(["member-sarah"]);
  });
});
