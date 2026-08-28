import type { Routine } from "../entities/routine";

/**
 * Timezone-aware local-wall-time -> UTC conversion (Implementation.md §12).
 * Never generate occurrences by repeatedly adding 24 hours in UTC — DST
 * shifts the UTC offset partway through the year, which would drift the
 * displayed local time. This converges on the correct UTC instant using the
 * runtime's IANA timezone database (via Intl), the same technique
 * date-fns-tz/luxon use internally, without adding a dependency.
 */
export function zonedTimeToUtc(localDate: string, localTime: string, timeZone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const [hour, minute] = localTime.split(":").map(Number) as [number, number];

  let utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Two passes is enough to converge even right at a DST boundary.
  for (let i = 0; i < 2; i++) {
    const offsetMinutes = timeZoneOffsetMinutes(new Date(utcGuessMs), timeZone);
    utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60_000;
  }
  return new Date(utcGuessMs);
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]),
    Number(parts["minute"]),
    Number(parts["second"]),
  );
  return (asUtc - date.getTime()) / 60_000;
}

export type OccurrenceCandidate = {
  scheduledForUtc: string;
  scheduledLocalDate: string;
};

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

/**
 * Generates candidate occurrences for a routine over an inclusive local-date
 * range, respecting daysOfWeek, startDate and endDate. Pure and
 * side-effect-free: the calling use case is responsible for idempotently
 * persisting only the candidates that don't already exist
 * (Implementation.md §12: processing the same due occurrence twice must not
 * create duplicates).
 */
export function generateOccurrenceCandidates(
  routine: Routine,
  fromLocalDate: string,
  toLocalDate: string,
): OccurrenceCandidate[] {
  const candidates: OccurrenceCandidate[] = [];
  const rangeStart = routine.startDate > fromLocalDate ? routine.startDate : fromLocalDate;
  const rangeEnd =
    routine.endDate !== null && routine.endDate < toLocalDate ? routine.endDate : toLocalDate;

  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const dayOfWeek = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (routine.daysOfWeek.includes(dayOfWeek)) {
      candidates.push({
        scheduledForUtc: zonedTimeToUtc(cursor, routine.localTime, routine.timezone).toISOString(),
        scheduledLocalDate: cursor,
      });
    }
    cursor = addDays(cursor, 1);
  }
  return candidates;
}
