import type { CareCircleRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { assertPermission } from "../../domain/policies/permissionGuard";
import { NotFoundError } from "../../domain/errors/DomainError";

export type ReorderMemberPriorityDeps = {
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Change a circle member's escalation priority (Implementation.md §7.8:
 * "Allow reorder controls, but changes must produce an audit event").
 * Requires canManageCircle.
 */
export async function reorderMemberPriority(
  deps: ReorderMemberPriorityDeps,
  input: { careCircleId: string; actorUserId: string; circleMemberId: string; newPriority: number },
): Promise<void> {
  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    input.careCircleId,
  );
  const actorPermission = actorMember
    ? await deps.careCircles.findPermission(actorMember.id)
    : null;
  assertPermission(actorPermission, "canManageCircle");

  const target = await deps.careCircles.findMemberById(input.circleMemberId);
  if (!target || target.careCircleId !== input.careCircleId) {
    throw new NotFoundError("CircleMember", input.circleMemberId);
  }

  const nowIso = deps.clock.now().toISOString();
  const previousPriority = target.priority;
  await deps.careCircles.saveMember({ ...target, priority: input.newPriority, updatedAt: nowIso });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "circle_member.reordered",
    entityType: "CircleMember",
    entityId: target.id,
    timestamp: nowIso,
    metadata: { previousPriority, newPriority: input.newPriority },
  });
}
