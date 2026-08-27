import type { OccurrenceRepository, RoutineRepository } from "../ports/repositories";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import type { Clock } from "../../shared/time/Clock";
import { generateOccurrenceCandidates } from "../../domain/services/occurrenceGeneration";
import { NotFoundError } from "../../domain/errors/DomainError";

export type GenerateOccurrencesDeps = {
  routines: RoutineRepository;
  occurrences: OccurrenceRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

/**
 * Generates occurrences for a routine up to (and including) a local date
 * (Implementation.md §12). Idempotent: only creates the occurrences that
 * don't already exist for that routine + scheduled instant, so running this
 * repeatedly (e.g. from a scheduler poll) never creates duplicates.
 */
export async function generateOccurrences(
  deps: GenerateOccurrencesDeps,
  input: { routineId: string; upToLocalDate: string },
): Promise<number> {
  const routine = await deps.routines.findById(input.routineId);
  if (!routine) throw new NotFoundError("Routine", input.routineId);
  if (!routine.enabled) return 0;

  const candidates = generateOccurrenceCandidates(routine, routine.startDate, input.upToLocalDate);
  const nowIso = deps.clock.now().toISOString();
  let created = 0;

  for (const candidate of candidates) {
    const existing = await deps.occurrences.findByRoutineAndScheduledForUtc(
      routine.id,
      candidate.scheduledForUtc,
    );
    if (existing) continue;

    await deps.occurrences.save({
      id: deps.idGenerator.nextId(),
      routineId: routine.id,
      scheduledForUtc: candidate.scheduledForUtc,
      scheduledLocalDate: candidate.scheduledLocalDate,
      status: "scheduled",
      acknowledgedAt: null,
      acknowledgedBy: null,
      acknowledgementChannel: null,
      alertId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    created += 1;
  }

  return created;
}
