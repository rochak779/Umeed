import type {
  CareCircleRepository,
  OccurrenceRepository,
  RoutineRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { NotFoundError, PermissionDeniedError } from "../../domain/errors/DomainError";
import { transitionOccurrence } from "../../domain/state-machines/occurrenceStateMachine";
import type { AcknowledgementChannel, OccurrenceStatus } from "../../domain/entities/routine";

export type AcknowledgeOccurrenceDeps = {
  routines: RoutineRepository;
  occurrences: OccurrenceRepository;
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type AcknowledgeOccurrenceResult = { ok: true; alreadyAcknowledged: boolean };

const FINAL_STATUSES: ReadonlyArray<OccurrenceStatus> = ["acknowledged", "resolved", "cancelled"];

/**
 * The older adult's "Done" action (Implementation.md §7.4). Internally
 * records an acknowledgement — never claims independent proof that a
 * medicine was actually taken. Acknowledging an already-acknowledged
 * occurrence succeeds quietly rather than erroring (§16 Phase 4 acceptance:
 * "already-acknowledged handling").
 */
export async function acknowledgeOccurrence(
  deps: AcknowledgeOccurrenceDeps,
  input: { occurrenceId: string; actorUserId: string; channel: AcknowledgementChannel },
): Promise<AcknowledgeOccurrenceResult> {
  const occurrence = await deps.occurrences.findById(input.occurrenceId);
  if (!occurrence) throw new NotFoundError("RoutineOccurrence", input.occurrenceId);

  const routine = await deps.routines.findById(occurrence.routineId);
  if (!routine) throw new NotFoundError("Routine", occurrence.routineId);

  const circle = await deps.careCircles.findById(routine.careCircleId);
  if (circle?.olderAdultId !== input.actorUserId) {
    throw new PermissionDeniedError("acknowledge_own_routine");
  }

  if (FINAL_STATUSES.includes(occurrence.status)) {
    return { ok: true, alreadyAcknowledged: true };
  }

  // The act of acknowledging implies the reminder was effectively "live" —
  // fast-forward through the awaiting_response step if it hasn't happened
  // yet (e.g. she does the routine before the scheduler marks it due).
  const readyForAck =
    occurrence.status === "scheduled"
      ? transitionOccurrence(occurrence.status, "awaiting_response")
      : occurrence.status;
  const nextStatus = transitionOccurrence(readyForAck, "acknowledged");

  const nowIso = deps.clock.now().toISOString();
  await deps.occurrences.save({
    ...occurrence,
    status: nextStatus,
    acknowledgedAt: nowIso,
    acknowledgedBy: input.actorUserId,
    acknowledgementChannel: input.channel,
    updatedAt: nowIso,
  });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: routine.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "routine.acknowledged",
    entityType: "RoutineOccurrence",
    entityId: occurrence.id,
    timestamp: nowIso,
    metadata: { channel: input.channel },
  });

  return { ok: true, alreadyAcknowledged: false };
}
