import { describe, expect, it, vi } from "vitest";
import { setRoutinePaused } from "./setRoutinePaused";
import type { SetRoutinePausedDeps } from "./setRoutinePaused";
import {
  buildCircleMember,
  buildMemberPermission,
  buildRoutine,
} from "../../../test/builders/entities";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";

describe("setRoutinePaused", () => {
  it("a coordinator can pause an enabled routine", async () => {
    const routine = buildRoutine({ enabled: true });
    const member = buildCircleMember({ responderType: "coordinator" });
    const permission = buildMemberPermission(member.id, "coordinator");
    const deps = {
      routines: { findById: async () => routine, save: vi.fn(async () => {}) },
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetRoutinePausedDeps;
    const result = await setRoutinePaused(deps, {
      routineId: routine.id,
      actorUserId: member.userId,
      paused: true,
    });
    expect(result).toEqual({ ok: true });
    expect(deps.routines.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(deps.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "routine.paused",
        entityType: "Routine",
        entityId: routine.id,
      }),
    );
  });

  it("a coordinator can resume a paused routine", async () => {
    const routine = buildRoutine({ enabled: false });
    const member = buildCircleMember({ responderType: "coordinator" });
    const permission = buildMemberPermission(member.id, "coordinator");
    const deps = {
      routines: { findById: async () => routine, save: vi.fn(async () => {}) },
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetRoutinePausedDeps;
    const result = await setRoutinePaused(deps, {
      routineId: routine.id,
      actorUserId: member.userId,
      paused: false,
    });
    expect(result).toEqual({ ok: true });
    expect(deps.routines.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(deps.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "routine.resumed" }),
    );
  });

  it("a nearby responder without canManageRoutines cannot pause a routine", async () => {
    const routine = buildRoutine({ enabled: true });
    const member = buildCircleMember({ responderType: "nearby_responder" });
    const permission = buildMemberPermission(member.id, "nearby_responder");
    const deps = {
      routines: { findById: async () => routine, save: vi.fn(async () => {}) },
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetRoutinePausedDeps;
    await expect(
      setRoutinePaused(deps, { routineId: routine.id, actorUserId: member.userId, paused: true }),
    ).rejects.toThrow();
    expect(deps.routines.save).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an unknown routine", async () => {
    const deps = {
      routines: { findById: async () => null, save: vi.fn(async () => {}) },
      careCircles: {
        findMemberByUserAndCircle: async () => null,
        findPermission: async () => null,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetRoutinePausedDeps;
    await expect(
      setRoutinePaused(deps, { routineId: "missing", actorUserId: "user-1", paused: true }),
    ).rejects.toThrow();
  });
});
