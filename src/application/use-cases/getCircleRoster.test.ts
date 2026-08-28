import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { getCircleRoster } from "./getCircleRoster";

describe("getCircleRoster", () => {
  it("gives the coordinator the full roster with permissions and priority", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);

    const result = await getCircleRoster(repos, { careCircleId: circle.id, actorUserId: "sarah" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.kind).toBe("full");
    if (result.view.kind !== "full") return;
    expect(result.view.members).toHaveLength(4);
    const priya = result.view.members.find((m) => m.userId === "priya");
    expect(priya?.responderType).toBe("nearby_responder");
    expect(priya?.canViewMedicationLabels).toBe(false);
  });

  it("gives a nearby responder only the minimal view — no other members' details", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);

    const result = await getCircleRoster(repos, { careCircleId: circle.id, actorUserId: "priya" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.kind).toBe("minimal");
    if (result.view.kind !== "minimal") return;
    expect(result.view.olderAdultPreferredName).toBe("Margaret");
    expect(result.view.actorRole).toBe("nearby_responder");
  });

  it("rejects a user who is not an active member of the circle", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);

    const result = await getCircleRoster(repos, {
      careCircleId: circle.id,
      actorUserId: "a-stranger",
    });

    expect(result).toEqual({ ok: false, code: "not_a_member" });
  });

  it("rejects a removed member", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle, members } = await seedMargaretScenario(repos);
    await repos.careCircles.saveMember({ ...members.danielMember, membershipStatus: "removed" });

    const result = await getCircleRoster(repos, { careCircleId: circle.id, actorUserId: "daniel" });

    expect(result).toEqual({ ok: false, code: "not_a_member" });
  });
});
