import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { startFor } from "@/features/circle/circleApi";
import { NotAMemberError } from "@/server/membership";
import { listConsentFor, setConsentFor } from "./consentApi";

describe("consent API", () => {
  it("refuses consent records to someone outside the circle", async () => {
    const deps = buildInMemoryAppDeps();
    const { circle } = await startFor(deps, "sarah", {
      olderAdultPreferredName: "Margaret",
      invitedEmail: null,
      invitedPhone: null,
    });
    await expect(listConsentFor(deps, "outsider", { circleId: circle.id })).rejects.toBeInstanceOf(
      NotAMemberError,
    );
    await expect(
      setConsentFor(deps, "outsider", {
        circleId: circle.id,
        consentType: "circle_participation",
        status: "granted",
      }),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });
});
