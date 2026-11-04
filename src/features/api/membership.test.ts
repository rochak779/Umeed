import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { buildCareCircle, buildCircleMember } from "../../../test/builders/entities";
import { NotAMemberError, requireActiveMember } from "./membership";

async function circleWith(status: "active" | "invited" | "removed") {
  const deps = buildInMemoryAppDeps();
  await deps.careCircleRepository.save(buildCareCircle({ id: "c-1" }));
  await deps.careCircleRepository.saveMember(
    buildCircleMember({
      id: "m-1",
      careCircleId: "c-1",
      userId: "user-1",
      membershipStatus: status,
    }),
  );
  return deps;
}

describe("requireActiveMember", () => {
  it("returns the membership of an active member", async () => {
    const deps = await circleWith("active");
    const member = await requireActiveMember(deps, "user-1", "c-1");
    expect(member.id).toBe("m-1");
  });

  it("rejects someone who is not in the circle", async () => {
    const deps = await circleWith("active");
    await expect(requireActiveMember(deps, "outsider", "c-1")).rejects.toBeInstanceOf(
      NotAMemberError,
    );
  });

  it("rejects a member whose membership is not active", async () => {
    const deps = await circleWith("removed");
    await expect(requireActiveMember(deps, "user-1", "c-1")).rejects.toBeInstanceOf(
      NotAMemberError,
    );
  });
});
