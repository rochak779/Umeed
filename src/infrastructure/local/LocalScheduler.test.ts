import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { LocalScheduler } from "./LocalScheduler";

const { pollDueWorkMock } = vi.hoisted(() => ({
  pollDueWorkMock: vi.fn(),
}));

vi.mock("../../application/use-cases/pollDueWork", () => ({
  pollDueWork: pollDueWorkMock,
}));

describe("LocalScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pollDueWorkMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not start a second poll while the first one is still in flight (slow poll, short interval)", async () => {
    let resolveFirstPoll: () => void = () => {};
    const firstPollPromise = new Promise<void>((resolve) => {
      resolveFirstPoll = resolve;
    });
    pollDueWorkMock.mockImplementationOnce(() => firstPollPromise);
    pollDueWorkMock.mockResolvedValue(undefined);

    const scheduler = new LocalScheduler({} as never, () => ["circle-1"]);
    scheduler.start(10);

    // First tick kicks off a poll that never resolves on its own.
    await vi.advanceTimersByTimeAsync(10);
    expect(pollDueWorkMock).toHaveBeenCalledTimes(1);

    // Several more intervals elapse while the first poll is still in flight.
    await vi.advanceTimersByTimeAsync(50);
    expect(pollDueWorkMock).toHaveBeenCalledTimes(1);

    // Once the first poll resolves, the next tick is allowed to start a new one.
    resolveFirstPoll();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(pollDueWorkMock).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });
});
