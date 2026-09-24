import { describe, expect, it, vi, beforeEach } from "vitest";
import { FakeClock } from "../../shared/time/Clock";
import { pollDueWork, type PollDueWorkDeps } from "./pollDueWork";

const { generateOccurrencesMock, raiseMissedRoutineAlertMock, releaseExpiredClaimMock } =
  vi.hoisted(() => ({
    generateOccurrencesMock: vi.fn(),
    raiseMissedRoutineAlertMock: vi.fn(),
    releaseExpiredClaimMock: vi.fn(),
  }));

vi.mock("./generateOccurrences", () => ({
  generateOccurrences: generateOccurrencesMock,
}));
vi.mock("./raiseMissedRoutineAlert", () => ({
  raiseMissedRoutineAlert: raiseMissedRoutineAlertMock,
}));
vi.mock("./releaseExpiredClaim", () => ({
  releaseExpiredClaim: releaseExpiredClaimMock,
}));

describe("pollDueWork", () => {
  beforeEach(() => {
    generateOccurrencesMock.mockReset();
    raiseMissedRoutineAlertMock.mockReset();
    releaseExpiredClaimMock.mockReset();
  });

  it("generates occurrences, raises missed-routine alerts, and releases expired claims for every given circle", async () => {
    const routine = { id: "routine-1", careCircleId: "circle-1", enabled: true };
    const dueOccurrence = { id: "occ-1", routineId: "routine-1", status: "awaiting_response" };
    const openAlertWithExpiredClaim = {
      id: "alert-1",
      careCircleId: "circle-1",
      status: "claimed",
    };

    generateOccurrencesMock.mockResolvedValue(1);
    raiseMissedRoutineAlertMock.mockResolvedValue({ ok: true, alertId: "alert-2" });
    releaseExpiredClaimMock.mockResolvedValue({ ok: true, released: true });

    const deps = {
      clock: new FakeClock(new Date("2026-08-28T00:00:00.000Z")),
      routines: { findByCareCircle: vi.fn(async () => [routine]) },
      occurrences: { findDue: vi.fn(async () => [dueOccurrence]) },
      alerts: { findOpenByCareCircle: vi.fn(async () => [openAlertWithExpiredClaim]) },
    } as unknown as PollDueWorkDeps;

    const result = await pollDueWork(deps, { careCircleIds: ["circle-1"] });

    expect(generateOccurrencesMock).toHaveBeenCalledWith(
      deps,
      expect.objectContaining({ routineId: "routine-1" }),
    );
    expect(raiseMissedRoutineAlertMock).toHaveBeenCalledWith(deps, { occurrenceId: "occ-1" });
    expect(releaseExpiredClaimMock).toHaveBeenCalledWith(deps, { alertId: "alert-1" });
    expect(result).toEqual({ occurrencesGenerated: 1, alertsRaised: 1, claimsReleased: 1 });
  });

  it("running twice in a row does not raise a second alert for the same occurrence", async () => {
    const routine = { id: "routine-1", careCircleId: "circle-1", enabled: true };

    generateOccurrencesMock.mockResolvedValue(0);
    raiseMissedRoutineAlertMock.mockResolvedValue({ ok: false, reason: "already_resolved" });
    releaseExpiredClaimMock.mockResolvedValue({ ok: true, released: false });

    const deps = {
      clock: new FakeClock(new Date("2026-08-28T00:00:00.000Z")),
      routines: { findByCareCircle: vi.fn(async () => [routine]) },
      occurrences: { findDue: vi.fn(async () => []) },
      alerts: { findOpenByCareCircle: vi.fn(async () => []) },
    } as unknown as PollDueWorkDeps;

    await pollDueWork(deps, { careCircleIds: ["circle-1"] });
    const result = await pollDueWork(deps, { careCircleIds: ["circle-1"] });

    expect(result.alertsRaised).toBe(0);
  });
});
