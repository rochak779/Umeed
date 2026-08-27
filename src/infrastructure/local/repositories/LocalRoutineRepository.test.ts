import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalRoutineRepository } from "./LocalRoutineRepository";
import type { EscalationPolicy, Routine } from "../../../domain/entities/routine";

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "routine-1",
    careCircleId: "circle-1",
    olderAdultId: "margaret",
    type: "medication",
    title: "Morning check-in and tablets",
    description: null,
    timezone: "Europe/London",
    localTime: "09:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: "2026-01-01",
    endDate: null,
    gracePeriodMinutes: 30,
    visibility: "family_and_nearby",
    enabled: true,
    notificationChannels: ["in_app"],
    createdBy: "sarah",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePolicy(overrides: Partial<EscalationPolicy> = {}): EscalationPolicy {
  return {
    id: "policy-1",
    routineId: "routine-1",
    name: "Default",
    enabled: true,
    steps: [
      {
        order: 1,
        delayMinutes: 0,
        recipientType: "older_adult",
        recipientId: null,
        channel: "in_app",
        responseWindowMinutes: 10,
        fallbackBehaviour: "advance_to_next_step",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LocalRoutineRepository", () => {
  it("lists routines for a care circle", async () => {
    const repo = new LocalRoutineRepository(new InMemoryKeyValueStore());
    await repo.save(makeRoutine({ id: "r-1", careCircleId: "circle-1" }));
    await repo.save(makeRoutine({ id: "r-2", careCircleId: "circle-2" }));
    expect((await repo.findByCareCircle("circle-1")).map((r) => r.id)).toEqual(["r-1"]);
  });

  it("stores and retrieves a routine's escalation policy", async () => {
    const repo = new LocalRoutineRepository(new InMemoryKeyValueStore());
    await repo.saveEscalationPolicy(makePolicy());
    const policy = await repo.findEscalationPolicy("routine-1");
    expect(policy?.steps).toHaveLength(1);
  });
});
