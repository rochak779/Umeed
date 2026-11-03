import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { buildUserProfile } from "../../../test/builders/entities";
import { startFor } from "@/features/circle/circleApi";
import { acceptFor } from "@/features/invitations/invitationApi";
import { raiseHelpFor } from "@/features/routines/routineApi";
import { NotAMemberError } from "@/server/membership";
import { claimFor, claimInput, listFor, resolveFor } from "./alertApi";

async function circleWithHelpAlert() {
  const deps = buildInMemoryAppDeps();
  await deps.profileRepository.save(buildUserProfile({ id: "sarah", preferredName: "Sarah" }));
  const { circle, plaintextToken } = await startFor(deps, "sarah", {
    olderAdultPreferredName: "Margaret",
    invitedEmail: "margaret@example.test",
    invitedPhone: null,
  });
  await acceptFor(
    deps,
    { userId: "margaret", email: "margaret@example.test" },
    { token: plaintextToken },
  );
  const { alertId } = await raiseHelpFor(deps, "margaret", {});
  return { deps, circleId: circle.id, alertId };
}

describe("alert API", () => {
  it("refuses the alert list to someone outside the circle", async () => {
    const { deps, circleId } = await circleWithHelpAlert();
    await expect(listFor(deps, "outsider", { circleId })).rejects.toBeInstanceOf(NotAMemberError);
  });

  it("returns alerts with member names to a member", async () => {
    const { deps, circleId, alertId } = await circleWithHelpAlert();
    const screen = await listFor(deps, "sarah", { circleId });
    expect(screen.alerts.map((a) => a.id)).toContain(alertId);
    expect(screen.members.some((m) => m.preferredName === "Sarah")).toBe(true);
  });

  it("refuses a claim from someone outside the alert's circle", async () => {
    const { deps, alertId } = await circleWithHelpAlert();
    await expect(claimFor(deps, "outsider", { alertId })).rejects.toBeInstanceOf(NotAMemberError);
  });

  it("claims as the verified user, ignoring a claimer sent by the browser", async () => {
    const { deps, alertId } = await circleWithHelpAlert();
    const parsed = claimInput.parse({ alertId, claimerUserId: "someone-else" });
    expect(parsed).toEqual({ alertId });

    const result = await claimFor(deps, "sarah", parsed);
    expect(result.ok).toBe(true);
    expect((await deps.alertRepository.findById(alertId))?.claimedBy).toBe("sarah");
  });

  it("refuses to resolve an alert in a circle the actor is not in", async () => {
    const { deps, alertId } = await circleWithHelpAlert();
    await expect(
      resolveFor(deps, "outsider", { alertId, resolutionCode: "false_or_accidental" }),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });
});
