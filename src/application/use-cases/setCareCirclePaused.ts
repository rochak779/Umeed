import type { CareCircleRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { assertPermission } from "../../domain/policies/permissionGuard";
import { NotFoundError } from "../../domain/errors/DomainError";

export type SetCareCirclePausedDeps = {
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Pause/resume an entire care circle (Implementation.md §16 Phase 7).
 * Requires canManageCircle — toggles `CareCircle.status` between "active"
 * and "paused".
 */
export async function setCareCirclePaused(
  deps: SetCareCirclePausedDeps,
  input: { careCircleId: string; actorUserId: string; paused: boolean },
): Promise<{ ok: true }> {
  const circle = await deps.careCircles.findById(input.careCircleId);
  if (!circle) throw new NotFoundError("CareCircle", input.careCircleId);

  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    input.careCircleId,
  );
  const actorPermission = actorMember
    ? await deps.careCircles.findPermission(actorMember.id)
    : null;
  assertPermission(actorPermission, "canManageCircle");

  const nowIso = deps.clock.now().toISOString();
  await deps.careCircles.save({
    ...circle,
    status: input.paused ? "paused" : "active",
    updatedAt: nowIso,
  });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: circle.id,
    actorId: input.actorUserId,
    actorType: "user",
    action: input.paused ? "circle.paused" : "circle.resumed",
    entityType: "CareCircle",
    entityId: circle.id,
    timestamp: nowIso,
    metadata: {},
  });

  return { ok: true };
}
