import { describe, expect, it, vi } from "vitest";
import { setCareCirclePaused } from "./setCareCirclePaused";
import type { SetCareCirclePausedDeps } from "./setCareCirclePaused";
import {
  buildCareCircle,
  buildCircleMember,
  buildMemberPermission,
} from "../../../test/builders/entities";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { InvalidTransitionError } from "../../domain/errors/DomainError";

describe("setCareCirclePaused", () => {
  it.each([true, false])(
    "refuses to change a circle still waiting for consent (paused=%s), so resume can never skip consent",
    async (paused) => {
      const circle = buildCareCircle({ status: "pending_consent" });
      const member = buildCircleMember({ responderType: "coordinator" });
      const permission = buildMemberPermission(member.id, "coordinator");
      const deps = {
        careCircles: {
          findById: async () => circle,
          save: vi.fn(async () => {}),
          findMemberByUserAndCircle: async () => member,
          findPermission: async () => permission,
        },
        audit: { append: vi.fn(async () => {}) },
        clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
        idGenerator: new SequentialIdGenerator("audit"),
      } as unknown as SetCareCirclePausedDeps;
      await expect(
        setCareCirclePaused(deps, { careCircleId: circle.id, actorUserId: member.userId, paused }),
      ).rejects.toThrow(InvalidTransitionError);
      expect(deps.careCircles.save).not.toHaveBeenCalled();
    },
  );

  it("a coordinator can pause an active circle", async () => {
    const circle = buildCareCircle({ status: "active" });
    const member = buildCircleMember({ responderType: "coordinator" });
    const permission = buildMemberPermission(member.id, "coordinator");
    const deps = {
      careCircles: {
        findById: async () => circle,
        save: vi.fn(async () => {}),
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetCareCirclePausedDeps;
    const result = await setCareCirclePaused(deps, {
      careCircleId: circle.id,
      actorUserId: member.userId,
      paused: true,
    });
    expect(result).toEqual({ ok: true });
    expect(deps.careCircles.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused" }),
    );
    expect(deps.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "circle.paused", entityType: "CareCircle" }),
    );
  });

  it("a coordinator can resume a paused circle", async () => {
    const circle = buildCareCircle({ status: "paused" });
    const member = buildCircleMember({ responderType: "coordinator" });
    const permission = buildMemberPermission(member.id, "coordinator");
    const deps = {
      careCircles: {
        findById: async () => circle,
        save: vi.fn(async () => {}),
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetCareCirclePausedDeps;
    const result = await setCareCirclePaused(deps, {
      careCircleId: circle.id,
      actorUserId: member.userId,
      paused: false,
    });
    expect(result).toEqual({ ok: true });
    expect(deps.careCircles.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });

  it("a family member without canManageCircle cannot pause a circle", async () => {
    const circle = buildCareCircle({ status: "active" });
    const member = buildCircleMember({ responderType: "family" });
    const permission = buildMemberPermission(member.id, "family");
    const deps = {
      careCircles: {
        findById: async () => circle,
        save: vi.fn(async () => {}),
        findMemberByUserAndCircle: async () => member,
        findPermission: async () => permission,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetCareCirclePausedDeps;
    await expect(
      setCareCirclePaused(deps, {
        careCircleId: circle.id,
        actorUserId: member.userId,
        paused: true,
      }),
    ).rejects.toThrow();
    expect(deps.careCircles.save).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an unknown circle", async () => {
    const deps = {
      careCircles: {
        findById: async () => null,
        save: vi.fn(async () => {}),
        findMemberByUserAndCircle: async () => null,
        findPermission: async () => null,
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as SetCareCirclePausedDeps;
    await expect(
      setCareCirclePaused(deps, { careCircleId: "missing", actorUserId: "user-1", paused: true }),
    ).rejects.toThrow();
  });
});
