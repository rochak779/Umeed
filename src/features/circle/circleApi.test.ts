import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { NotAMemberError } from "@/server/membership";
import { inviteFor, inviteInput, rosterFor, startFor } from "./circleApi";

async function circleCoordinatedBy(userId: string) {
  const deps = buildInMemoryAppDeps();
  const { circle } = await startFor(deps, userId, {
    olderAdultPreferredName: "Margaret",
    invitedEmail: "margaret@example.test",
    invitedPhone: null,
  });
  return { deps, circleId: circle.id };
}

describe("circle API", () => {
  it("refuses the roster to someone outside the circle", async () => {
    const { deps, circleId } = await circleCoordinatedBy("sarah");
    await expect(rosterFor(deps, "outsider", { circleId })).rejects.toBeInstanceOf(NotAMemberError);
  });

  it("returns the roster and circle to a member", async () => {
    const { deps, circleId } = await circleCoordinatedBy("sarah");
    const { result, circle } = await rosterFor(deps, "sarah", { circleId });
    expect(result.ok).toBe(true);
    expect(circle?.id).toBe(circleId);
  });

  it("strips a browser-supplied actor so the invite is recorded as the verified user", async () => {
    const { deps, circleId } = await circleCoordinatedBy("sarah");
    const parsed = inviteInput.parse({
      circleId,
      actorUserId: "someone-else",
      invitedEmail: "neighbour@example.test",
      invitedPhone: null,
      proposedResponderType: "nearby_responder",
      proposedRelationship: "Neighbour",
    });
    expect(parsed).not.toHaveProperty("actorUserId");

    await inviteFor(deps, "sarah", parsed);
    const invites = await deps.invitationRepository.findByCareCircle(circleId);
    expect(
      invites.some(
        (i) => i.invitedEmail === "neighbour@example.test" && i.invitedByUserId === "sarah",
      ),
    ).toBe(true);
  });

  it("refuses an invite from someone outside the circle", async () => {
    const { deps, circleId } = await circleCoordinatedBy("sarah");
    await expect(
      inviteFor(deps, "outsider", {
        circleId,
        invitedEmail: "x@example.test",
        invitedPhone: null,
        proposedResponderType: "nearby_responder",
        proposedRelationship: "Neighbour",
      }),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });
});
