import type { Clock } from "../../shared/time/Clock";
import { generateOccurrences, type GenerateOccurrencesDeps } from "./generateOccurrences";
import {
  raiseMissedRoutineAlert,
  type RaiseMissedRoutineAlertDeps,
} from "./raiseMissedRoutineAlert";
import { releaseExpiredClaim, type ReleaseExpiredClaimDeps } from "./releaseExpiredClaim";

const LOOKAHEAD_DAYS = 14;

export type PollDueWorkDeps = GenerateOccurrencesDeps &
  RaiseMissedRoutineAlertDeps &
  ReleaseExpiredClaimDeps & {
    clock: Clock;
  };

export type PollDueWorkResult = {
  occurrencesGenerated: number;
  alertsRaised: number;
  claimsReleased: number;
};

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The local scheduler's single poll tick (Implementation.md §11.5): for
 * every given circle, generate any missing occurrences, raise alerts for
 * anything now overdue, and release any claim past its expiry. Delegates
 * every decision to the same idempotent use cases a test or a future
 * server-side scheduled job would call — this function only fans them out,
 * so running it repeatedly (e.g. two overlapping polls) never double-raises
 * an alert or double-releases a claim.
 */
export async function pollDueWork(
  deps: PollDueWorkDeps,
  input: { careCircleIds: string[] },
): Promise<PollDueWorkResult> {
  let occurrencesGenerated = 0;
  let alertsRaised = 0;
  let claimsReleased = 0;

  const nowUtc = deps.clock.now().toISOString();
  const upToLocalDate = addDays(nowUtc.slice(0, 10), LOOKAHEAD_DAYS);

  for (const careCircleId of input.careCircleIds) {
    const routines = await deps.routines.findByCareCircle(careCircleId);
    for (const routine of routines.filter((r) => r.enabled)) {
      occurrencesGenerated += await generateOccurrences(deps, {
        routineId: routine.id,
        upToLocalDate,
      });
    }
  }

  // findDue is not scoped per circle, so it's queried once regardless of
  // how many circles are being polled.
  const due = await deps.occurrences.findDue(nowUtc);
  for (const occurrence of due) {
    const result = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });
    if (result.ok) alertsRaised += 1;
  }

  for (const careCircleId of input.careCircleIds) {
    const openAlerts = await deps.alerts.findOpenByCareCircle(careCircleId);
    for (const alert of openAlerts.filter((a) => a.status === "claimed")) {
      const result = await releaseExpiredClaim(deps, { alertId: alert.id });
      if (result.released) claimsReleased += 1;
    }
  }

  return { occurrencesGenerated, alertsRaised, claimsReleased };
}
