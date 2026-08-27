import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { PermissionDeniedError } from "../../domain/errors/DomainError";
import { hasPermission } from "../../domain/policies/permissionGuard";
import { reorderMemberPriority } from "./reorderMemberPriority";
import { revokeMemberPermission } from "./revokeMemberPermission";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  return {
    careCircles: repos.careCircles,
    audit: repos.audit,
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("reorderMemberPriority", () => {
  it("lets the coordinator change a member's escalation priority and records an audit event", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { members } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await reorderMemberPriority(deps, {
      careCircleId: "circle-margaret",
      actorUserId: "sarah",
      circleMemberId: members.danielMember.id,
      newPriority: 0,
    });

    const updated = await repos.careCircles.findMemberById(members.danielMember.id);
    expect(updated?.priority).toBe(0);
    const events = await repos.audit.findByCareCircle("circle-margaret");
    expect(events.some((e) => e.action === "circle_member.reordered")).toBe(true);
  });

  it("rejects a member without canManageCircle", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { members } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      reorderMemberPriority(deps, {
        careCircleId: "circle-margaret",
        actorUserId: "daniel",
        circleMemberId: members.priyaMember.id,
        newPriority: 0,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

describe("revokeMemberPermission", () => {
  it("revoking a permission takes effect immediately and is audited", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { members } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    const before = await repos.careCircles.findPermission(members.priyaMember.id);
    expect(hasPermission(before, "canReceiveAlerts")).toBe(true);

    await revokeMemberPermission(deps, {
      careCircleId: "circle-margaret",
      actorUserId: "margaret",
      circleMemberId: members.priyaMember.id,
    });

    const after = await repos.careCircles.findPermission(members.priyaMember.id);
    expect(hasPermission(after, "canReceiveAlerts")).toBe(false);
    expect(hasPermission(after, "canViewRoutineStatus")).toBe(false);

    const events = await repos.audit.findByCareCircle("circle-margaret");
    expect(events.some((e) => e.action === "member_permission.revoked")).toBe(true);
  });

  it("the older adult (not just the coordinator) can revoke access", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { members } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      revokeMemberPermission(deps, {
        careCircleId: "circle-margaret",
        actorUserId: "margaret",
        circleMemberId: members.danielMember.id,
      }),
    ).resolves.not.toThrow();
  });

  it("rejects a family member with no management rights trying to revoke someone else's access", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { members } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      revokeMemberPermission(deps, {
        careCircleId: "circle-margaret",
        actorUserId: "daniel",
        circleMemberId: members.priyaMember.id,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
