import { describe, expect, it, vi } from "vitest";
import { requestLeaveCircle } from "./requestLeaveCircle";
import type { RequestLeaveCircleDeps } from "./requestLeaveCircle";
import { buildCircleMember } from "../../../test/builders/entities";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";

describe("requestLeaveCircle", () => {
  it("a family member can leave a circle", async () => {
    const member = buildCircleMember({ responderType: "family" });
    const deps = {
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        saveMember: vi.fn(async () => {}),
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as RequestLeaveCircleDeps;
    const result = await requestLeaveCircle(deps, {
      careCircleId: member.careCircleId,
      userId: member.userId,
    });
    expect(result).toEqual({ ok: true });
    expect(deps.careCircles.saveMember).toHaveBeenCalledWith(
      expect.objectContaining({ membershipStatus: "removed" }),
    );
    expect(deps.audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "member.left", entityType: "CircleMember" }),
    );
  });

  it("a nearby responder can leave a circle", async () => {
    const member = buildCircleMember({ responderType: "nearby_responder" });
    const deps = {
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        saveMember: vi.fn(async () => {}),
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as RequestLeaveCircleDeps;
    const result = await requestLeaveCircle(deps, {
      careCircleId: member.careCircleId,
      userId: member.userId,
    });
    expect(result).toEqual({ ok: true });
  });

  it("a coordinator attempting to leave throws PermissionDeniedError", async () => {
    const member = buildCircleMember({ responderType: "coordinator" });
    const deps = {
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        saveMember: vi.fn(async () => {}),
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as RequestLeaveCircleDeps;
    await expect(
      requestLeaveCircle(deps, { careCircleId: member.careCircleId, userId: member.userId }),
    ).rejects.toThrow("coordinator_and_older_adult_cannot_leave");
    expect(deps.careCircles.saveMember).not.toHaveBeenCalled();
  });

  it("the older adult attempting to leave throws PermissionDeniedError", async () => {
    const member = buildCircleMember({ responderType: "older_adult" });
    const deps = {
      careCircles: {
        findMemberByUserAndCircle: async () => member,
        saveMember: vi.fn(async () => {}),
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as RequestLeaveCircleDeps;
    await expect(
      requestLeaveCircle(deps, { careCircleId: member.careCircleId, userId: member.userId }),
    ).rejects.toThrow("coordinator_and_older_adult_cannot_leave");
    expect(deps.careCircles.saveMember).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the caller is not a member of the circle", async () => {
    const deps = {
      careCircles: {
        findMemberByUserAndCircle: async () => null,
        saveMember: vi.fn(async () => {}),
      },
      audit: { append: vi.fn(async () => {}) },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("audit"),
    } as unknown as RequestLeaveCircleDeps;
    await expect(
      requestLeaveCircle(deps, { careCircleId: "circle-1", userId: "user-1" }),
    ).rejects.toThrow();
    expect(deps.careCircles.saveMember).not.toHaveBeenCalled();
  });
});
