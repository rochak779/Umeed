import { describe, expect, it, vi } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalRoutineRepository } from "../../infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../infrastructure/local/repositories/LocalOccurrenceRepository";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { generateOccurrences } from "./generateOccurrences";
import { buildRoutine } from "../../../test/builders/entities";

function makeDeps() {
  const store = new InMemoryKeyValueStore();
  return {
    routines: new LocalRoutineRepository(store),
    occurrences: new LocalOccurrenceRepository(store),
    idGenerator: new SequentialIdGenerator("occ"),
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
  };
}

describe("generateOccurrences", () => {
  it("creates one occurrence per matching day up to the given local date", async () => {
    const deps = makeDeps();
    const routine = buildRoutine({ startDate: "2026-01-01" });
    await deps.routines.save(routine);

    const created = await generateOccurrences(deps, {
      routineId: routine.id,
      upToLocalDate: "2026-01-03",
    });

    expect(created).toBe(3);
    expect(await deps.occurrences.findByRoutine(routine.id)).toHaveLength(3);
  });

  it("is idempotent: running it twice does not create duplicates", async () => {
    const deps = makeDeps();
    const routine = buildRoutine({ startDate: "2026-01-01" });
    await deps.routines.save(routine);

    await generateOccurrences(deps, { routineId: routine.id, upToLocalDate: "2026-01-03" });
    const createdSecondRun = await generateOccurrences(deps, {
      routineId: routine.id,
      upToLocalDate: "2026-01-03",
    });

    expect(createdSecondRun).toBe(0);
    expect(await deps.occurrences.findByRoutine(routine.id)).toHaveLength(3);
  });

  it("starts from fromLocalDate instead of the routine's start date when given", async () => {
    const deps = makeDeps();
    const routine = buildRoutine({ startDate: "2026-01-01" });
    await deps.routines.save(routine);

    const created = await generateOccurrences(deps, {
      routineId: routine.id,
      fromLocalDate: "2026-01-09",
      upToLocalDate: "2026-01-10",
    });

    expect(created).toBe(2);
    expect(
      (await deps.occurrences.findByRoutine(routine.id)).map((o) => o.scheduledLocalDate).sort(),
    ).toEqual(["2026-01-09", "2026-01-10"]);
  });

  it("reads the routine's existing occurrences once, not once per day", async () => {
    const deps = makeDeps();
    const routine = buildRoutine({ startDate: "2026-01-01" });
    await deps.routines.save(routine);
    await generateOccurrences(deps, { routineId: routine.id, upToLocalDate: "2026-01-10" });
    // Measured on a re-run, which saves nothing (the local store's own save
    // also uses the per-day lookup to enforce uniqueness).
    const perDayLookup = vi.spyOn(deps.occurrences, "findByRoutineAndScheduledForUtc");
    const findByRoutine = vi.spyOn(deps.occurrences, "findByRoutine");

    await generateOccurrences(deps, { routineId: routine.id, upToLocalDate: "2026-01-10" });

    expect(perDayLookup).not.toHaveBeenCalled();
    expect(findByRoutine).toHaveBeenCalledTimes(1);
  });

  it("does not generate for a disabled routine", async () => {
    const deps = makeDeps();
    const routine = buildRoutine({ startDate: "2026-01-01", enabled: false });
    await deps.routines.save(routine);

    const created = await generateOccurrences(deps, {
      routineId: routine.id,
      upToLocalDate: "2026-01-03",
    });

    expect(created).toBe(0);
  });
});
