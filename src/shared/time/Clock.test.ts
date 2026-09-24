import { describe, expect, it } from "vitest";
import { FakeClock, SystemClock } from "./Clock";

describe("SystemClock", () => {
  it("returns the real current time", () => {
    const clock = new SystemClock();
    const before = Date.now();
    const now = clock.now().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe("FakeClock", () => {
  it("starts at the provided time", () => {
    const clock = new FakeClock(new Date("2026-01-01T09:00:00.000Z"));
    expect(clock.now().toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });

  it("advances by an exact number of milliseconds", () => {
    const clock = new FakeClock(new Date("2026-01-01T09:00:00.000Z"));
    clock.advanceMs(60_000);
    expect(clock.now().toISOString()).toBe("2026-01-01T09:01:00.000Z");
  });

  it("can be set to an exact time", () => {
    const clock = new FakeClock(new Date("2026-01-01T09:00:00.000Z"));
    clock.setTo(new Date("2026-06-01T00:00:00.000Z"));
    expect(clock.now().toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});
