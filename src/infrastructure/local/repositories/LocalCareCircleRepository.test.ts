import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalCareCircleRepository } from "./LocalCareCircleRepository";
import type { CareCircle, CircleMember } from "../../../domain/entities/careCircle";

function makeCircle(overrides: Partial<CareCircle> = {}): CareCircle {
  return {
    id: "circle-1",
    name: "Margaret's circle",
    olderAdultId: "margaret",
    coordinatorId: "sarah",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMember(overrides: Partial<CircleMember> = {}): CircleMember {
  return {
    id: "member-1",
    careCircleId: "circle-1",
    userId: "sarah",
    relationship: "daughter",
    responderType: "coordinator",
    isNearby: false,
    priority: 0,
    availability: null,
    preferredChannel: "in_app",
    membershipStatus: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LocalCareCircleRepository", () => {
  it("finds only the circles a user has an active membership in", async () => {
    const repo = new LocalCareCircleRepository(new InMemoryKeyValueStore());
    await repo.save(makeCircle({ id: "circle-1" }));
    await repo.save(makeCircle({ id: "circle-2" }));
    await repo.saveMember(makeMember({ careCircleId: "circle-1", userId: "sarah" }));
    await repo.saveMember(
      makeMember({
        id: "m-2",
        careCircleId: "circle-2",
        userId: "sarah",
        membershipStatus: "declined",
      }),
    );

    const circles = await repo.findByUserId("sarah");

    expect(circles.map((c) => c.id)).toEqual(["circle-1"]);
  });

  it("finds a member by user and circle", async () => {
    const repo = new LocalCareCircleRepository(new InMemoryKeyValueStore());
    await repo.saveMember(makeMember());
    const member = await repo.findMemberByUserAndCircle("sarah", "circle-1");
    expect(member?.id).toBe("member-1");
  });

  it("returns null when no permission has been granted yet", async () => {
    const repo = new LocalCareCircleRepository(new InMemoryKeyValueStore());
    expect(await repo.findPermission("member-1")).toBeNull();
  });
});
