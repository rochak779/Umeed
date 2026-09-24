import { describe, expect, it } from "vitest";
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
