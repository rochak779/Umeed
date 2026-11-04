import type { Clock } from "../../shared/time/Clock.ts";
import { generateOccurrences, type GenerateOccurrencesDeps } from "./generateOccurrences.ts";
import {
  raiseMissedRoutineAlert,
  type RaiseMissedRoutineAlertDeps,
} from "./raiseMissedRoutineAlert.ts";
import { releaseExpiredClaim, type ReleaseExpiredClaimDeps } from "./releaseExpiredClaim.ts";

const LOOKAHEAD_DAYS = 14;
// An occurrence missed longer ago than this no longer raises an alert: if the
// job was down for a while, families shouldn't get a burst of alerts about
// days that are long gone.
const MISSED_ALERT_WINDOW_MS = 24 * 60 * 60_000;

export type PollDueWorkDeps = GenerateOccurrencesDeps &
  RaiseMissedRoutineAlertDeps &
  ReleaseExpiredClaimDeps & {
    clock: Clock;
  };

export type PollDueWorkResult = {
  occurrencesGenerated: number;
  alertsRaised: number;
  claimsReleased: number;
  /** Routines/occurrences/alerts whose step threw; the run carried on past them. */
  errors: number;
};

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * One poll tick (Implementation.md §11.5), run by the umeed-poll-due-work
 * scheduled job (and LocalScheduler in local mode): for every given circle,
 * generate any missing occurrences, raise alerts for anything now overdue,
 * and release any claim past its expiry. Delegates every decision to the
 * same idempotent use cases, so overlapping runs never double-raise an alert
 * or double-release a claim. Work is bounded to a recent window, and one
 * failing item (e.g. losing a race to an overlapping run) is counted and
 * skipped rather than aborting the whole run.
 */
export async function pollDueWork(
  deps: PollDueWorkDeps,
  input: { careCircleIds: string[] },
): Promise<PollDueWorkResult> {
  const result: PollDueWorkResult = {
    occurrencesGenerated: 0,
    alertsRaised: 0,
    claimsReleased: 0,
    errors: 0,
  };
  const attempt = async (what: string, step: () => Promise<void>) => {
    try {
      await step();
    } catch (error) {
      result.errors += 1;
      // Message only — never the care-circle/occurrence payload (§15).
      console.error(
        `pollDueWork: ${what} failed:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const now = deps.clock.now();
  const nowUtc = now.toISOString();
  const today = nowUtc.slice(0, 10);
  const fromLocalDate = addDays(today, -1);
  const upToLocalDate = addDays(today, LOOKAHEAD_DAYS);

  for (const careCircleId of input.careCircleIds) {
    const routines = await deps.routines.findByCareCircle(careCircleId);
    for (const routine of routines.filter((r) => r.enabled)) {
      await attempt(`generating routine ${routine.id}`, async () => {
        result.occurrencesGenerated += await generateOccurrences(deps, {
          routineId: routine.id,
          fromLocalDate,
          upToLocalDate,
        });
      });
    }
  }

  // findDue is not scoped per circle: the scheduled job polls every active
  // circle anyway, and LocalScheduler's store holds one household.
  const notBeforeUtc = new Date(now.getTime() - MISSED_ALERT_WINDOW_MS).toISOString();
  const due = await deps.occurrences.findDue(nowUtc, notBeforeUtc);
  for (const occurrence of due) {
    await attempt(`raising alert for occurrence ${occurrence.id}`, async () => {
      const raised = await raiseMissedRoutineAlert(deps, { occurrenceId: occurrence.id });
      if (raised.ok) result.alertsRaised += 1;
    });
  }

  for (const careCircleId of input.careCircleIds) {
    const openAlerts = await deps.alerts.findOpenByCareCircle(careCircleId);
    for (const alert of openAlerts.filter((a) => a.status === "claimed")) {
      await attempt(`releasing claim on alert ${alert.id}`, async () => {
        const released = await releaseExpiredClaim(deps, { alertId: alert.id });
        if (released.released) result.claimsReleased += 1;
      });
    }
  }

  return result;
}
