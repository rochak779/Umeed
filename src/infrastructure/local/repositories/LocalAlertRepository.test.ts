import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalAlertRepository } from "./LocalAlertRepository";
import type { Alert } from "../../../domain/entities/alert";

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    careCircleId: "circle-1",
    occurrenceId: "occ-1",
    source: "missed_routine",
    status: "unclaimed",
    severity: "urgent",
    currentStage: 2,
    openedAt: "2026-01-05T09:20:00.000Z",
    claimedAt: null,
    claimedBy: null,
    claimExpiresAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionCode: null,
    resolutionNote: null,
    updatedAt: "2026-01-05T09:20:00.000Z",
    ...overrides,
  };
}

describe("LocalAlertRepository.tryClaim", () => {
  it("succeeds when the alert has no current claim", async () => {
    const repo = new LocalAlertRepository(new InMemoryKeyValueStore());
    await repo.save(makeAlert());

    const won = await repo.tryClaim(
      "alert-1",
      "priya",
      "2026-01-05T09:25:00.000Z",
      "2026-01-05T09:30:00.000Z",
    );

    expect(won).toBe(true);
    const alert = await repo.findById("alert-1");
    expect(alert?.claimedBy).toBe("priya");
    expect(alert?.status).toBe("claimed");
  });

  it("only one of two simultaneous claims wins; the loser gets false, not an error", async () => {
    const repo = new LocalAlertRepository(new InMemoryKeyValueStore());
    await repo.save(makeAlert());

    const [first, second] = await Promise.all([
      repo.tryClaim("alert-1", "priya", "2026-01-05T09:25:00.000Z", "2026-01-05T09:30:00.000Z"),
      repo.tryClaim("alert-1", "sarah", "2026-01-05T09:25:00.000Z", "2026-01-05T09:30:00.000Z"),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    const alert = await repo.findById("alert-1");
    expect(alert?.claimedBy).toBe(first ? "priya" : "sarah");
  });

  it("fails to claim an alert that is already claimed by someone else", async () => {
    const repo = new LocalAlertRepository(new InMemoryKeyValueStore());
    await repo.save(makeAlert({ status: "claimed", claimedBy: "priya" }));

    const won = await repo.tryClaim(
      "alert-1",
      "sarah",
      "2026-01-05T09:25:00.000Z",
      "2026-01-05T09:30:00.000Z",
    );

    expect(won).toBe(false);
  });

  it("fails to claim a resolved alert", async () => {
    const repo = new LocalAlertRepository(new InMemoryKeyValueStore());
    await repo.save(makeAlert({ status: "resolved", claimedBy: "priya" }));

    const won = await repo.tryClaim(
      "alert-1",
      "sarah",
      "2026-01-05T09:25:00.000Z",
      "2026-01-05T09:30:00.000Z",
    );

    expect(won).toBe(false);
  });
});
