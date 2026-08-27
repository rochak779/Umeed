import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { generateOccurrences } from "./generateOccurrences";
import { getNextRoutineForOlderAdult } from "./getNextRoutineForOlderAdult";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";

describe("getNextRoutineForOlderAdult", () => {
  it("returns the earliest unresolved occurrence with its routine title and time", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { routine } = await seedMargaretScenario(repos);
    await generateOccurrences(
      {
        ...repos,
        idGenerator: new SequentialIdGenerator("occ"),
        clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
      },
      { routineId: routine.id, upToLocalDate: "2026-01-10" },
    );

    const result = await getNextRoutineForOlderAdult(repos, { olderAdultUserId: "margaret" });

    expect(result?.routineTitle).toBe("Morning check-in and tablets");
    expect(result?.localTime).toBe("09:00");
  });

  it("returns null when there are no circles for that user", async () => {
    const repos = buildMargaretScenarioRepositories();
    const result = await getNextRoutineForOlderAdult(repos, { olderAdultUserId: "nobody" });
    expect(result).toBeNull();
  });

  it("skips occurrences already acknowledged or resolved", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { routine } = await seedMargaretScenario(repos);
    await generateOccurrences(
      {
        ...repos,
        idGenerator: new SequentialIdGenerator("occ"),
        clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
      },
      { routineId: routine.id, upToLocalDate: "2026-01-02" },
    );
    const [first, second] = await repos.occurrences.findByRoutine(routine.id);
    await repos.occurrences.save({ ...first!, status: "acknowledged" });

    const result = await getNextRoutineForOlderAdult(repos, { olderAdultUserId: "margaret" });

    expect(result?.occurrenceId).toBe(second!.id);
  });
});
