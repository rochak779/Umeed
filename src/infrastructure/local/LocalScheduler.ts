import { pollDueWork, type PollDueWorkDeps } from "../../application/use-cases/pollDueWork";

/**
 * Runs pollDueWork on an interval while the app is open (Implementation.md
 * §11.5). This is local-development infrastructure, not a durable
 * scheduler — it stops when the tab closes. Never expose start/stop
 * controls in product UI; the app shell starts it once on mount and stops
 * it on unmount only.
 */
export class LocalScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly deps: PollDueWorkDeps,
    private readonly getCareCircleIds: () => string[],
  ) {}

  start(intervalMs: number): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void pollDueWork(this.deps, { careCircleIds: this.getCareCircleIds() });
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
