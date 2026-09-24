import { describe, expect, it } from "vitest";
import {
  updateNotificationPreference,
  type UpdateNotificationPreferenceDeps,
} from "./updateNotificationPreference";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";

describe("updateNotificationPreference", () => {
  it("creates a new preference when none exists for the channel", async () => {
    const saved: unknown[] = [];
    const deps = {
      consent: {
        findNotificationPreferences: async () => [],
        saveNotificationPreference: async (p: unknown) => {
          saved.push(p);
        },
      },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("pref"),
    } as unknown as UpdateNotificationPreferenceDeps;
    const result = await updateNotificationPreference(deps, {
      userId: "user-1",
      careCircleId: "circle-1",
      channel: "push",
      enabled: true,
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
      timezone: "Europe/London",
      urgentAlertsOverrideQuietHours: true,
    });
    expect(result).toEqual({ ok: true });
    expect(saved).toHaveLength(1);
  });

  it("updates the existing preference for that channel instead of duplicating it", async () => {
    const existing = {
      id: "pref-existing",
      userId: "user-1",
      careCircleId: "circle-1",
      channel: "push" as const,
      enabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "Europe/London",
      urgentAlertsOverrideQuietHours: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const saved: Array<{ id: string }> = [];
    const deps = {
      consent: {
        findNotificationPreferences: async () => [existing],
        saveNotificationPreference: async (p: { id: string }) => {
          saved.push(p);
        },
      },
      clock: new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      idGenerator: new SequentialIdGenerator("pref"),
    } as unknown as UpdateNotificationPreferenceDeps;
    await updateNotificationPreference(deps, {
      userId: "user-1",
      careCircleId: "circle-1",
      channel: "push",
      enabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "Europe/London",
      urgentAlertsOverrideQuietHours: false,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.id).toBe("pref-existing");
  });
});
