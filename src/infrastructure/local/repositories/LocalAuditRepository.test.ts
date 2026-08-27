import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalAuditRepository } from "./LocalAuditRepository";
import type { AuditEvent } from "../../../domain/entities/consent";

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "audit-1",
    careCircleId: "circle-1",
    actorId: "sarah",
    actorType: "user",
    action: "member.reordered",
    entityType: "CircleMember",
    entityId: "member-1",
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("LocalAuditRepository", () => {
  it("appends and lists events for a care circle", async () => {
    const repo = new LocalAuditRepository(new InMemoryKeyValueStore());
    await repo.append(makeEvent({ id: "a-1" }));
    await repo.append(makeEvent({ id: "a-2" }));
    expect(await repo.findByCareCircle("circle-1")).toHaveLength(2);
  });

  it("does not leak events from another care circle", async () => {
    const repo = new LocalAuditRepository(new InMemoryKeyValueStore());
    await repo.append(makeEvent({ id: "a-1", careCircleId: "circle-1" }));
    await repo.append(makeEvent({ id: "a-2", careCircleId: "circle-2" }));
    expect(await repo.findByCareCircle("circle-1")).toHaveLength(1);
  });
});
