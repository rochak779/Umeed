/**
 * Clock abstraction (Implementation.md §11.4).
 * Domain and application code must never call `Date.now()`/`new Date()`
 * directly — inject a Clock instead so time is controllable in tests.
 */
export interface Clock {
  now(): Date;
}

/** Real wall-clock time. Used in every normal application run. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Deterministic clock for tests and developer scripts only. Must never be
 * reachable from product UI.
 */
export class FakeClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date(0)) {
    this.current = start;
  }

  now(): Date {
    return this.current;
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  setTo(date: Date): void {
    this.current = date;
  }
}
