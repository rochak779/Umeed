import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { startFor } from "@/features/circle/circleApi";
import { acceptFor, acceptInput, previewFor } from "./invitationApi";

async function invitedMargaret() {
  const deps = buildInMemoryAppDeps();
  const { circle, plaintextToken } = await startFor(deps, "sarah", {
    olderAdultPreferredName: "Margaret",
    invitedEmail: "margaret@example.test",
    invitedPhone: null,
  });
  return { deps, circleId: circle.id, token: plaintextToken };
}

describe("invitation API", () => {
  it("previews an invitation without a signed-in user", async () => {
    const { deps, token } = await invitedMargaret();
    const preview = await previewFor(deps, { token });
    expect(preview.ok).toBe(true);
  });

  it("reports an unknown token", async () => {
    const { deps } = await invitedMargaret();
    expect(await previewFor(deps, { token: "nope" })).toEqual({ ok: false, code: "invalid_token" });
  });

  it("binds the membership to the verified user, ignoring any user sent by the browser", async () => {
    const { deps, circleId, token } = await invitedMargaret();
    const parsed = acceptInput.parse({
      token,
      userId: "attacker",
      userEmail: "attacker@example.test",
    });
    expect(parsed).toEqual({ token });

    const result = await acceptFor(
      deps,
      { userId: "margaret-id", email: "margaret@example.test" },
      parsed,
    );
    expect(result).toEqual({ ok: true });
    const member = await deps.careCircleRepository.findMemberByUserAndCircle(
      "margaret-id",
      circleId,
    );
    expect(member?.membershipStatus).toBe("active");
  });

  it("refuses an invitation addressed to a different email", async () => {
    const { deps, token } = await invitedMargaret();
    const result = await acceptFor(
      deps,
      { userId: "u-2", email: "someone@example.test" },
      { token },
    );
    expect(result).toEqual({ ok: false, code: "wrong_account" });
  });
});
