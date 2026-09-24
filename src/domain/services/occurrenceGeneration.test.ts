import { describe, expect, it } from "vitest";
import { generateOccurrenceCandidates, zonedTimeToUtc } from "./occurrenceGeneration";
import type { Routine } from "../entities/routine";

function londonOffsetMinutesAt(utcDate: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(utcDate).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]),
    Number(parts["minute"]),
    Number(parts["second"]),
  );
  return (asUtc - utcDate.getTime()) / 60000;
}

describe("zonedTimeToUtc", () => {
  it("converts a winter (GMT, UTC+0) local time correctly", () => {
    const utc = zonedTimeToUtc("2026-01-15", "09:00", "Europe/London");
    expect(utc.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("converts a summer (BST, UTC+1) local time correctly", () => {
    const utc = zonedTimeToUtc("2026-06-15", "09:00", "Europe/London");
    expect(utc.toISOString()).toBe("2026-06-15T08:00:00.000Z");
  });

  it("round-trips back to 09:00 local time in both seasons (DST-safe)", () => {
    for (const localDate of ["2026-01-15", "2026-06-15"]) {
      const utc = zonedTimeToUtc(localDate, "09:00", "Europe/London");
      const offsetMinutes = londonOffsetMinutesAt(utc);
      const localHour = new Date(utc.getTime() + offsetMinutes * 60000).getUTCHours();
      expect(localHour).toBe(9);
    }
  });
});

const baseRoutine: Routine = {
  id: "routine-1",
  careCircleId: "circle-1",
  olderAdultId: "margaret",
  type: "medication",
  title: "Morning tablets",
  description: null,
  timezone: "Europe/London",
  localTime: "09:00",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  startDate: "2026-01-01",
  endDate: null,
  gracePeriodMinutes: 30,
  visibility: "family_and_nearby",
  enabled: true,
  notificationChannels: ["in_app"],
  createdBy: "sarah",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("generateOccurrenceCandidates", () => {
  it("generates one candidate per matching day in the range", () => {
    const candidates = generateOccurrenceCandidates(baseRoutine, "2026-01-05", "2026-01-07");
    expect(candidates.map((c) => c.scheduledLocalDate)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ]);
  });

  it("skips days not in daysOfWeek", () => {
    const weekdaysOnly: Routine = { ...baseRoutine, daysOfWeek: [1, 2, 3, 4, 5] }; // Mon-Fri
    // 2026-01-03 is a Saturday, 2026-01-04 is a Sunday
    const candidates = generateOccurrenceCandidates(weekdaysOnly, "2026-01-03", "2026-01-05");
    expect(candidates.map((c) => c.scheduledLocalDate)).toEqual(["2026-01-05"]);
  });

  it("does not generate before startDate or after endDate", () => {
    const bounded: Routine = { ...baseRoutine, startDate: "2026-01-05", endDate: "2026-01-06" };
    const candidates = generateOccurrenceCandidates(bounded, "2026-01-01", "2026-01-10");
    expect(candidates.map((c) => c.scheduledLocalDate)).toEqual(["2026-01-05", "2026-01-06"]);
  });

  it("keeps 09:00 local across a DST transition", () => {
    // 2026-03-29 is the last Sunday of March (UK clocks go forward at 01:00 UTC),
    // so 09:00 local time is already BST on the transition day itself.
    const candidates = generateOccurrenceCandidates(baseRoutine, "2026-03-28", "2026-03-30");
    const utcHours = candidates.map((c) => new Date(c.scheduledForUtc).getUTCHours());
    // Before the transition: 09:00 GMT = 09:00 UTC. From the transition day on: 09:00 BST = 08:00 UTC.
    expect(utcHours).toEqual([9, 8, 8]);

    // Whichever offset applied, formatting each instant back into Europe/London
    // must show 09:00 — that's the actual DST-safety guarantee.
    for (const c of candidates) {
      const local = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(c.scheduledForUtc));
      expect(local).toBe("09:00");
    }
  });

  it("keeps 09:00 local across the autumn DST transition (clocks go back)", () => {
    // 2026-10-25 is the last Sunday of October (UK clocks go back at 01:00 UTC),
    // so 09:00 local time is already GMT again on the transition day itself.
    const candidates = generateOccurrenceCandidates(baseRoutine, "2026-10-24", "2026-10-26");
    const utcHours = candidates.map((c) => new Date(c.scheduledForUtc).getUTCHours());
    // Before the transition: 09:00 BST = 08:00 UTC. From the transition day on: 09:00 GMT = 09:00 UTC.
    expect(utcHours).toEqual([8, 9, 9]);

    for (const c of candidates) {
      const local = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(c.scheduledForUtc));
      expect(local).toBe("09:00");
    }
  });
});
