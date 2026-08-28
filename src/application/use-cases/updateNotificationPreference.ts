import type { ConsentRepository } from "../ports/repositories";
import type { Channel } from "../../domain/entities/careCircle";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";

export type UpdateNotificationPreferenceDeps = {
  consent: ConsentRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Notification preference and quiet-hours configuration (Implementation.md
 * §7.11, §16 Phase 7). One preference row per user/circle/channel — updates
 * in place rather than accumulating duplicate rows for the same channel.
 */
export async function updateNotificationPreference(
  deps: UpdateNotificationPreferenceDeps,
  input: {
    userId: string;
    careCircleId: string;
    channel: Channel;
    enabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    timezone: string;
    urgentAlertsOverrideQuietHours: boolean;
  },
): Promise<{ ok: true }> {
  const existingList = await deps.consent.findNotificationPreferences(
    input.userId,
    input.careCircleId,
  );
  const existing = existingList.find((p) => p.channel === input.channel);
  const nowIso = deps.clock.now().toISOString();

  await deps.consent.saveNotificationPreference({
    id: existing?.id ?? deps.idGenerator.nextId(),
    userId: input.userId,
    careCircleId: input.careCircleId,
    channel: input.channel,
    enabled: input.enabled,
    quietHoursStart: input.quietHoursStart,
    quietHoursEnd: input.quietHoursEnd,
    timezone: input.timezone,
    urgentAlertsOverrideQuietHours: input.urgentAlertsOverrideQuietHours,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  });

  return { ok: true };
}
