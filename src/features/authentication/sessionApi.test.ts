import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import {
  buildCareCircle,
  buildCircleMember,
  buildUserProfile,
} from "../../../test/builders/entities";
import { loadSessionStateFor } from "./sessionApi";

const actor = { userId: "user-1", email: "priya@example.test", displayName: "Priya" };

describe("loadSessionStateFor", () => {
  it("creates the profile on first load, keyed by the verified user id", async () => {
    const deps = buildInMemoryAppDeps();
    const state = await loadSessionStateFor(deps, actor);

    expect(state.profile.id).toBe("user-1");
    expect(state.profile.displayName).toBe("Priya");
    expect(state.profile.email).toBe("priya@example.test");
    expect(await deps.profileRepository.findById("user-1")).toEqual(state.profile);
  });

  it("falls back to the email's local part when there is no display name", async () => {
    const deps = buildInMemoryAppDeps();
    const state = await loadSessionStateFor(deps, { ...actor, displayName: null });
    expect(state.profile.displayName).toBe("priya");
  });

  it("never overwrites an existing profile", async () => {
    const deps = buildInMemoryAppDeps();
    const existing = buildUserProfile({ id: "user-1", displayName: "Priya Sharma" });
    await deps.profileRepository.save(existing);

    const state = await loadSessionStateFor(deps, actor);
    expect(state.profile).toEqual(existing);
  });

  it("returns only circles where the user's membership is active", async () => {
    const deps = buildInMemoryAppDeps();
    await deps.careCircleRepository.save(buildCareCircle({ id: "c-active" }));
    await deps.careCircleRepository.save(buildCareCircle({ id: "c-removed" }));
    await deps.careCircleRepository.saveMember(
      buildCircleMember({
        id: "m-1",
        careCircleId: "c-active",
        userId: "user-1",
        membershipStatus: "active",
      }),
    );
    await deps.careCircleRepository.saveMember(
      buildCircleMember({
        id: "m-2",
        careCircleId: "c-removed",
        userId: "user-1",
        membershipStatus: "removed",
      }),
    );

    const state = await loadSessionStateFor(deps, actor);
    expect(state.memberships.map((m) => m.circle.id)).toEqual(["c-active"]);
    expect(state.memberships[0]?.member.id).toBe("m-1");
  });
});
