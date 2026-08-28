import type {
  RoutineRepository,
  CareCircleRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { assertPermission } from "../../domain/policies/permissionGuard";
import { NotFoundError } from "../../domain/errors/DomainError";

export type SetRoutinePausedDeps = {
  routines: RoutineRepository;
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Pause/resume a routine (Implementation.md §16 Phase 7). Requires
 * canManageRoutines — sets `Routine.enabled = !paused`.
 */
export async function setRoutinePaused(
  deps: SetRoutinePausedDeps,
  input: { routineId: string; actorUserId: string; paused: boolean },
): Promise<{ ok: true }> {
  const routine = await deps.routines.findById(input.routineId);
  if (!routine) throw new NotFoundError("Routine", input.routineId);

  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    routine.careCircleId,
  );
  const actorPermission = actorMember
    ? await deps.careCircles.findPermission(actorMember.id)
    : null;
  assertPermission(actorPermission, "canManageRoutines");

  const nowIso = deps.clock.now().toISOString();
  await deps.routines.save({ ...routine, enabled: !input.paused, updatedAt: nowIso });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: routine.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: input.paused ? "routine.paused" : "routine.resumed",
    entityType: "Routine",
    entityId: routine.id,
    timestamp: nowIso,
    metadata: {},
  });

  return { ok: true };
}
