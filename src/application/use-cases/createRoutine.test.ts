import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { PermissionDeniedError, ValidationError } from "../../domain/errors/DomainError";
import { createRoutine } from "./createRoutine";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  return {
    careCircles: repos.careCircles,
    routines: repos.routines,
    occurrences: repos.occurrences,
    audit: repos.audit,
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("createRoutine", () => {
  it("lets the coordinator create a routine and generates upcoming occurrences", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    const routine = await createRoutine(deps, {
      actorUserId: "sarah",
      careCircleId: circle.id,
      olderAdultId: "margaret",
      type: "hydration",
      title: "Afternoon water",
      description: null,
      timezone: "Europe/London",
      localTime: "15:00",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      startDate: "2026-01-01",
      endDate: null,
      gracePeriodMinutes: 20,
    });

    expect(routine.title).toBe("Afternoon water");
    const occurrences = await repos.occurrences.findByRoutine(routine.id);
    expect(occurrences.length).toBeGreaterThan(0);
  });

  it("gives the routine the default escalation policy, so a missed routine notifies someone", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    const routine = await createRoutine(deps, {
      actorUserId: "sarah",
      careCircleId: circle.id,
      olderAdultId: "margaret",
      type: "medication",
      title: "Morning tablets",
      description: null,
      timezone: "Europe/London",
      localTime: "09:00",
      daysOfWeek: [1],
      startDate: "2026-01-01",
      endDate: null,
      gracePeriodMinutes: 30,
    });

    const policy = await repos.routines.findEscalationPolicy(routine.id);
    expect(policy?.enabled).toBe(true);
    expect(policy?.steps.map((s) => s.recipientType)).toEqual([
      "older_adult",
      "older_adult",
      "nearby_responder",
      "coordinator",
    ]);
  });

  it("rejects an invalid local time", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      createRoutine(deps, {
        actorUserId: "sarah",
        careCircleId: circle.id,
        olderAdultId: "margaret",
        type: "hydration",
        title: "Bad time",
        description: null,
        timezone: "Europe/London",
        localTime: "9am", // invalid — must be HH:mm
        daysOfWeek: [1],
        startDate: "2026-01-01",
        endDate: null,
        gracePeriodMinutes: 20,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a family member without canManageRoutines", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      createRoutine(deps, {
        actorUserId: "daniel",
        careCircleId: circle.id,
        olderAdultId: "margaret",
        type: "hydration",
        title: "Water",
        description: null,
        timezone: "Europe/London",
        localTime: "15:00",
        daysOfWeek: [1],
        startDate: "2026-01-01",
        endDate: null,
        gracePeriodMinutes: 20,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
