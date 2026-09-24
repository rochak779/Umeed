import { describe, expect, it, vi } from "vitest";
import { processCallResponse } from "./processCallResponse";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { buildCareCircle, buildOccurrence, buildRoutine } from "../../../test/builders/entities";
import type { CommunicationEvent } from "../../domain/entities/alert";

function makeDeps() {
  const occurrence = buildOccurrence({ id: "occ-1", status: "awaiting_response" });
  const routine = buildRoutine({ id: "routine-1" });
  const circle = buildCareCircle({ id: "circle-1", olderAdultId: "older-adult-1" });
  const events: CommunicationEvent[] = [];
  return {
    occurrences: {
      findById: async (id: string) => (id === occurrence.id ? occurrence : null),
      save: vi.fn(async () => {}),
    },
    routines: { findById: async () => routine },
    careCircles: {
      findById: async () => circle,
      findByUserId: async () => [circle],
      findMembers: async () => [],
    },
    alerts: { save: vi.fn(async () => {}), saveRecipient: vi.fn(async () => {}) },
    communications: {
      findByIdempotencyKey: async (key: string) =>
        events.find((e) => e.idempotencyKey === key) ?? null,
      save: async (e: CommunicationEvent) => {
        events.push(e);
      },
    },
    notificationGateway: {
      send: async () => ({ providerReference: "ref", status: "sent" as const }),
    },
    audit: { append: vi.fn(async () => {}) },
    clock: new FakeClock(new Date("2026-01-05T09:10:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
    _occurrence: occurrence,
    _occurrencesSave: undefined as unknown,
  };
}

describe("processCallResponse", () => {
  it("keypad 1 acknowledges the occurrence", async () => {
    const deps = makeDeps();
    const result = await processCallResponse(deps, {
      occurrenceId: "occ-1",
      olderAdultUserId: "older-adult-1",
      keypad: "1",
      providerReference: "call-1",
    });
    expect(result).toEqual({ ok: true, action: "acknowledged" });
    expect(deps.occurrences.save).toHaveBeenCalled();
  });

  it("keypad 2 opens a direct-help alert", async () => {
    const deps = makeDeps();
    const result = await processCallResponse(deps, {
      occurrenceId: "occ-1",
      olderAdultUserId: "older-adult-1",
      keypad: "2",
      providerReference: "call-2",
    });
    expect(result).toEqual({ ok: true, action: "help_requested" });
    expect(deps.alerts.save).toHaveBeenCalled();
  });

  it("keypad 3 replays without changing occurrence state", async () => {
    const deps = makeDeps();
    const result = await processCallResponse(deps, {
      occurrenceId: "occ-1",
      olderAdultUserId: "older-adult-1",
      keypad: "3",
      providerReference: "call-3",
    });
    expect(result).toEqual({ ok: true, action: "replayed" });
    expect(deps.occurrences.save).not.toHaveBeenCalled();
    expect(deps.alerts.save).not.toHaveBeenCalled();
  });

  it("a duplicate callback with the same providerReference has no duplicate effect", async () => {
    const deps = makeDeps();
    await processCallResponse(deps, {
      occurrenceId: "occ-1",
      olderAdultUserId: "older-adult-1",
      keypad: "1",
      providerReference: "call-dup",
    });
    deps.occurrences.save.mockClear();
    const second = await processCallResponse(deps, {
      occurrenceId: "occ-1",
      olderAdultUserId: "older-adult-1",
      keypad: "1",
      providerReference: "call-dup",
    });
    expect(second).toEqual({ ok: true, action: "already_processed" });
    expect(deps.occurrences.save).not.toHaveBeenCalled();
  });
});
