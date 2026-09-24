import type { CareCircleRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { hasPermission } from "../../domain/policies/permissionGuard";
import { NotFoundError, PermissionDeniedError } from "../../domain/errors/DomainError";

export type RevokeMemberPermissionDeps = {
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Revoke a circle member's access outright (Implementation.md §7.11 "How to
 * revoke a person's access"). The older adult always has this right over her
 * own circle, in addition to a coordinator with canManageCircle — matching
 * "Independence before surveillance" (§3.1): she is not dependent on the
 * coordinator to act.
 */
export async function revokeMemberPermission(
  deps: RevokeMemberPermissionDeps,
  input: { careCircleId: string; actorUserId: string; circleMemberId: string },
): Promise<void> {
  const circle = await deps.careCircles.findById(input.careCircleId);
  const actorIsOlderAdult = circle?.olderAdultId === input.actorUserId;

  if (!actorIsOlderAdult) {
    const actorMember = await deps.careCircles.findMemberByUserAndCircle(
      input.actorUserId,
      input.careCircleId,
    );
    const actorPermission = actorMember
      ? await deps.careCircles.findPermission(actorMember.id)
      : null;
    if (!hasPermission(actorPermission, "canManageCircle")) {
      throw new PermissionDeniedError("canManageCircle");
    }
  }

  const target = await deps.careCircles.findMemberById(input.circleMemberId);
  if (!target || target.careCircleId !== input.careCircleId) {
    throw new NotFoundError("CircleMember", input.circleMemberId);
  }
  const targetPermission = await deps.careCircles.findPermission(target.id);
  if (!targetPermission) {
    throw new NotFoundError("MemberPermission", input.circleMemberId);
  }

  const nowIso = deps.clock.now().toISOString();
  await deps.careCircles.savePermission({ ...targetPermission, revokedAt: nowIso });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "member_permission.revoked",
    entityType: "MemberPermission",
    entityId: targetPermission.id,
    timestamp: nowIso,
    metadata: {},
  });
}
