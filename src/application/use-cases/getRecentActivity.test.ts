import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../../infrastructure/local/KeyValueStore";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { getRecentActivity } from "./getRecentActivity";

describe("getRecentActivity", () => {
  it("returns events newest first, with a human label", async () => {
    const audit = new LocalAuditRepository(new InMemoryKeyValueStore());
    await audit.append({
      id: "a-1",
      careCircleId: "circle-1",
      actorId: "margaret",
      actorType: "user",
      action: "routine.acknowledged",
      entityType: "RoutineOccurrence",
      entityId: "occ-1",
      timestamp: "2026-01-05T09:05:00.000Z",
      metadata: {},
    });
    await audit.append({
      id: "a-2",
      careCircleId: "circle-1",
      actorId: "sarah",
      actorType: "user",
      action: "routine.created",
      entityType: "Routine",
      entityId: "routine-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: {},
    });

    const items = await getRecentActivity({ audit }, { careCircleId: "circle-1" });

    expect(items.map((i) => i.id)).toEqual(["a-1", "a-2"]);
    expect(items[0]?.label).toContain("acknowledged");
  });
});
