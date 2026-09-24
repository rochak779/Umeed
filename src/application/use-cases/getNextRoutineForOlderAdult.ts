import type {
  CareCircleRepository,
  OccurrenceRepository,
  RoutineRepository,
} from "../ports/repositories";

export type GetNextRoutineDeps = {
  careCircles: CareCircleRepository;
  routines: RoutineRepository;
  occurrences: OccurrenceRepository;
};

export type NextRoutineForOlderAdult = {
  occurrenceId: string;
  routineTitle: string;
  routineType: string;
  localTime: string;
  scheduledLocalDate: string;
  timezone: string;
  scheduledForUtc: string;
  status: string;
};

const UNRESOLVED_STATUSES = new Set(["scheduled", "awaiting_response", "missed", "escalating"]);

/**
 * The older adult's home screen needs exactly one thing to act on
 * (Implementation.md §7.4: "Next routine title and time"). Picks the
 * earliest not-yet-resolved occurrence across her circle's routines.
 */
export async function getNextRoutineForOlderAdult(
  deps: GetNextRoutineDeps,
  input: { olderAdultUserId: string },
): Promise<NextRoutineForOlderAdult | null> {
  const circles = await deps.careCircles.findByUserId(input.olderAdultUserId);
  const ownCircle = circles.find((c) => c.olderAdultId === input.olderAdultUserId);
  if (!ownCircle) return null;

  const routines = await deps.routines.findByCareCircle(ownCircle.id);
  let best: NextRoutineForOlderAdult | null = null;

  for (const routine of routines) {
    if (!routine.enabled) continue;
    const occurrences = await deps.occurrences.findByRoutine(routine.id);
    for (const occurrence of occurrences) {
      if (!UNRESOLVED_STATUSES.has(occurrence.status)) continue;
      if (!best || occurrence.scheduledForUtc < best.scheduledForUtc) {
        best = {
          occurrenceId: occurrence.id,
          routineTitle: routine.title,
          routineType: routine.type,
          localTime: routine.localTime,
          scheduledLocalDate: occurrence.scheduledLocalDate,
          timezone: routine.timezone,
          scheduledForUtc: occurrence.scheduledForUtc,
          status: occurrence.status,
        };
      }
    }
  }

  return best;
}
