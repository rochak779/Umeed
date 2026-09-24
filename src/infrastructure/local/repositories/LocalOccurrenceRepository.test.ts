import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalOccurrenceRepository } from "./LocalOccurrenceRepository";
import type { RoutineOccurrence } from "../../../domain/entities/routine";

function makeOccurrence(overrides: Partial<RoutineOccurrence> = {}): RoutineOccurrence {
  return {
    id: "occ-1",
    routineId: "routine-1",
    scheduledForUtc: "2026-01-05T09:00:00.000Z",
    scheduledLocalDate: "2026-01-05",
    status: "scheduled",
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementChannel: null,
    alertId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LocalOccurrenceRepository", () => {
  it("saves and finds an occurrence by routine + scheduledForUtc", async () => {
    const repo = new LocalOccurrenceRepository(new InMemoryKeyValueStore());
    await repo.save(makeOccurrence());
    const found = await repo.findByRoutineAndScheduledForUtc(
      "routine-1",
      "2026-01-05T09:00:00.000Z",
    );
    expect(found?.id).toBe("occ-1");
  });

  it("enforces uniqueness for routineId + scheduledForUtc: a second occurrence for the same slot is rejected", async () => {
    const repo = new LocalOccurrenceRepository(new InMemoryKeyValueStore());
    await repo.save(makeOccurrence({ id: "occ-1" }));
    await expect(
      repo.save(makeOccurrence({ id: "occ-2" })), // same routineId + scheduledForUtc, different id
    ).rejects.toThrow(/already exists/i);
  });

  it("allows re-saving the same occurrence id (idempotent update, not a duplicate)", async () => {
    const repo = new LocalOccurrenceRepository(new InMemoryKeyValueStore());
    await repo.save(makeOccurrence({ status: "scheduled" }));
    await repo.save(makeOccurrence({ status: "awaiting_response" }));
    const found = await repo.findById("occ-1");
    expect(found?.status).toBe("awaiting_response");
  });

  it("findDue returns only occurrences scheduled at or before the given time and not yet resolved", async () => {
    const repo = new LocalOccurrenceRepository(new InMemoryKeyValueStore());
    await repo.save(
      makeOccurrence({ id: "occ-past", scheduledForUtc: "2026-01-05T09:00:00.000Z" }),
    );
    await repo.save(
      makeOccurrence({ id: "occ-future", scheduledForUtc: "2026-01-06T09:00:00.000Z" }),
    );
    await repo.save(
      makeOccurrence({
        id: "occ-resolved",
        scheduledForUtc: "2026-01-04T09:00:00.000Z",
        status: "resolved",
      }),
    );

    const due = await repo.findDue("2026-01-05T09:00:00.000Z");

    expect(due.map((o) => o.id)).toEqual(["occ-past"]);
  });
});
