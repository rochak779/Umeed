import { describe, expect, it } from "vitest";
import { buildMargaretScenarioRepositories, seedMargaretScenario } from "./margaretScenario";

describe("Margaret reference scenario fixture", () => {
  it("seeds a consistent circle with Margaret, Sarah, Daniel and Priya (Implementation.md §5)", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle, routine } = await seedMargaretScenario(repos);

    const members = await repos.careCircles.findMembers(circle.id);
    expect(members).toHaveLength(4);

    const priya = members.find((m) => m.userId === "priya");
    expect(priya?.responderType).toBe("nearby_responder");
    expect(priya?.isNearby).toBe(true);

    expect(routine.localTime).toBe("09:00");
    expect(routine.olderAdultId).toBe("margaret");

    const priyaPermission = await repos.careCircles.findPermission(priya!.id);
    expect(priyaPermission?.canViewMedicationLabels).toBe(false);

    const policy = await repos.routines.findEscalationPolicy(routine.id);
    expect(policy?.steps.length).toBeGreaterThan(0);
  });

  it("is isolated per call: seeding twice does not share state", async () => {
    const repos1 = buildMargaretScenarioRepositories();
    const repos2 = buildMargaretScenarioRepositories();
    await seedMargaretScenario(repos1);

    expect(await repos2.careCircles.findMembers("circle-margaret")).toEqual([]);
  });
});
