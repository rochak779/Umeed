import type { CareCircleRepository, ProfileRepository } from "../ports/repositories";
import type { ResponderType } from "../../domain/entities/careCircle";
import { hasPermission } from "../../domain/policies/permissionGuard";

export type GetCircleRosterDeps = {
  careCircles: CareCircleRepository;
  profiles: ProfileRepository;
};

export type RosterMember = {
  circleMemberId: string;
  userId: string;
  relationship: string;
  responderType: ResponderType;
  isNearby: boolean;
  priority: number;
  membershipStatus: string;
  canViewMedicationLabels: boolean;
  canViewNotes: boolean;
  canViewAddress: boolean;
  canManageRoutines: boolean;
  canManageCircle: boolean;
};

export type GetCircleRosterResult =
  | { ok: true; view: { kind: "full"; members: RosterMember[] } }
  | {
      ok: true;
      view: { kind: "minimal"; olderAdultPreferredName: string; actorRole: ResponderType };
    }
  | { ok: false; code: "not_a_member" };

/**
 * Care-circle roster (Implementation.md §7.8) for the coordinator's
 * management screen, and the minimal trusted-responder view (§7.6) for
 * everyone else. Enforced here, not just hidden in the UI (§13.3).
 */
export async function getCircleRoster(
  deps: GetCircleRosterDeps,
  input: { careCircleId: string; actorUserId: string },
): Promise<GetCircleRosterResult> {
  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    input.careCircleId,
  );
  if (!actorMember || actorMember.membershipStatus !== "active") {
    return { ok: false, code: "not_a_member" };
  }

  const actorPermission = await deps.careCircles.findPermission(actorMember.id);
  if (hasPermission(actorPermission, "canManageCircle")) {
    const members = await deps.careCircles.findMembers(input.careCircleId);
    const active = members.filter((m) => m.membershipStatus === "active");
    const view: RosterMember[] = [];
    for (const member of active) {
      const permission = await deps.careCircles.findPermission(member.id);
      view.push({
        circleMemberId: member.id,
        userId: member.userId,
        relationship: member.relationship,
        responderType: member.responderType,
        isNearby: member.isNearby,
        priority: member.priority,
        membershipStatus: member.membershipStatus,
        canViewMedicationLabels: hasPermission(permission, "canViewMedicationLabels"),
        canViewNotes: hasPermission(permission, "canViewNotes"),
        canViewAddress: hasPermission(permission, "canViewAddress"),
        canManageRoutines: hasPermission(permission, "canManageRoutines"),
        canManageCircle: hasPermission(permission, "canManageCircle"),
      });
    }
    return { ok: true, view: { kind: "full", members: view } };
  }

  const circle = await deps.careCircles.findById(input.careCircleId);
  const olderAdultProfile = circle?.olderAdultId
    ? await deps.profiles.findById(circle.olderAdultId)
    : null;
  return {
    ok: true,
    view: {
      kind: "minimal",
      olderAdultPreferredName: olderAdultProfile?.preferredName ?? "them",
      actorRole: actorMember.responderType,
    },
  };
}
