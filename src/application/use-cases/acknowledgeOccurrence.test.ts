import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalRoutineRepository } from "../../infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../infrastructure/local/repositories/LocalOccurrenceRepository";
import { LocalCareCircleRepository } from "../../infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { acknowledgeOccurrence } from "./acknowledgeOccurrence";
import { PermissionDeniedError } from "../../domain/errors/DomainError";
import { buildCareCircle, buildOccurrence, buildRoutine } from "../../../test/builders/entities";

function makeDeps(clock = new FakeClock(new Date("2026-01-05T09:05:00.000Z"))) {
  const store = new InMemoryKeyValueStore();
  return {
    routines: new LocalRoutineRepository(store),
    occurrences: new LocalOccurrenceRepository(store),
    careCircles: new LocalCareCircleRepository(store),
    audit: new LocalAuditRepository(store),
    clock,
    idGenerator: new SequentialIdGenerator("id"),
  };
}

async function seed(deps: ReturnType<typeof makeDeps>) {
  await deps.careCircles.save(buildCareCircle({ id: "circle-1", olderAdultId: "margaret" }));
  const routine = buildRoutine({ id: "routine-1", careCircleId: "circle-1" });
  await deps.routines.save(routine);
  const occurrence = buildOccurrence({ id: "occ-1", routineId: "routine-1", status: "scheduled" });
  await deps.occurrences.save(occurrence);
  return { routine, occurrence };
}

describe("acknowledgeOccurrence", () => {
  it("lets the older adult acknowledge, in-app, once it's due", async () => {
    const deps = makeDeps();
    await seed(deps);

    const result = await acknowledgeOccurrence(deps, {
      occurrenceId: "occ-1",
      actorUserId: "margaret",
      channel: "in_app",
    });

    expect(result).toEqual({ ok: true, alreadyAcknowledged: false });
    const occurrence = await deps.occurrences.findById("occ-1");
    expect(occurrence?.status).toBe("acknowledged");
    expect(occurrence?.acknowledgedBy).toBe("margaret");
    expect(occurrence?.acknowledgementChannel).toBe("in_app");
  });

  it("acknowledging an already-acknowledged occurrence succeeds without changing anything", async () => {
    const deps = makeDeps();
    await seed(deps);
    await acknowledgeOccurrence(deps, {
      occurrenceId: "occ-1",
      actorUserId: "margaret",
      channel: "in_app",
    });

    const result = await acknowledgeOccurrence(deps, {
      occurrenceId: "occ-1",
      actorUserId: "margaret",
      channel: "in_app",
    });

    expect(result).toEqual({ ok: true, alreadyAcknowledged: true });
  });

  it("allows late acknowledgement of a missed occurrence", async () => {
    const deps = makeDeps();
    const { occurrence } = await seed(deps);
    await deps.occurrences.save({ ...occurrence, status: "missed" });

    const result = await acknowledgeOccurrence(deps, {
      occurrenceId: "occ-1",
      actorUserId: "margaret",
      channel: "in_app",
    });

    expect(result).toEqual({ ok: true, alreadyAcknowledged: false });
    expect((await deps.occurrences.findById("occ-1"))?.status).toBe("acknowledged");
  });

  it("rejects a family member acknowledging on the older adult's behalf", async () => {
    const deps = makeDeps();
    await seed(deps);

    await expect(
      acknowledgeOccurrence(deps, {
        occurrenceId: "occ-1",
        actorUserId: "sarah",
        channel: "in_app",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("writes an audit event for a genuine acknowledgement", async () => {
    const deps = makeDeps();
    await seed(deps);

    await acknowledgeOccurrence(deps, {
      occurrenceId: "occ-1",
      actorUserId: "margaret",
      channel: "in_app",
    });

    const events = await deps.audit.findByCareCircle("circle-1");
    expect(events.some((e) => e.action === "routine.acknowledged")).toBe(true);
  });
});
