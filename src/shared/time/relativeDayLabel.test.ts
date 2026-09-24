import { describe, expect, it } from "vitest";
import { relativeDayLabel } from "./relativeDayLabel";

// 2026-09-24 is a Thursday. 20:30 UTC is 21:30 in London (BST).
const NOW = new Date("2026-09-24T20:30:00.000Z");

describe("relativeDayLabel", () => {
  it("says Today for a date that is today in the routine's timezone", () => {
    expect(relativeDayLabel("2026-09-24", NOW, "Europe/London")).toBe("Today");
  });

  it("says Tomorrow for the next day", () => {
    expect(relativeDayLabel("2026-09-25", NOW, "Europe/London")).toBe("Tomorrow");
  });

  it("uses the weekday name for later dates", () => {
    expect(relativeDayLabel("2026-09-27", NOW, "Europe/London")).toBe("Sunday");
  });

  it("judges 'today' in the routine's timezone, not UTC", () => {
    // 23:30 UTC on the 24th is already 00:30 on the 25th in London.
    const lateNight = new Date("2026-09-24T23:30:00.000Z");
    expect(relativeDayLabel("2026-09-25", lateNight, "Europe/London")).toBe("Today");
  });
});
