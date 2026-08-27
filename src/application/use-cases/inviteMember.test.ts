import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { inviteMember } from "./inviteMember";
import { PermissionDeniedError } from "../../domain/errors/DomainError";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  return {
    careCircles: repos.careCircles,
    invitations: repos.invitations,
    audit: repos.audit,
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("inviteMember", () => {
  it("lets the coordinator invite an additional family member", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    const result = await inviteMember(deps, {
      careCircleId: circle.id,
      actorUserId: "sarah",
      invitedEmail: "rohan@example.com",
      invitedPhone: null,
      proposedResponderType: "family",
      proposedRelationship: "brother",
    });

    expect(result.ok).toBe(true);
    const invitations = await repos.invitations.findByCareCircle(circle.id);
    expect(invitations.some((i) => i.invitedEmail === "rohan@example.com")).toBe(true);
  });

  it("rejects a family member without canManageCircle trying to invite someone", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      inviteMember(deps, {
        careCircleId: circle.id,
        actorUserId: "daniel",
        invitedEmail: "new@example.com",
        invitedPhone: null,
        proposedResponderType: "family",
        proposedRelationship: "friend",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
