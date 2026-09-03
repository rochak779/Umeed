import type { ConsentRecord, NotificationPreference } from "@/domain/entities/consent";

export type ConsentRecordRow = {
  id: string;
  care_circle_id: string;
  subject_user_id: string;
  consent_type: ConsentRecord["consentType"];
  policy_version: string;
  status: ConsentRecord["status"];
  granted_at: string | null;
  revoked_at: string | null;
  recorded_by: string;
};
export function consentRecordToRow(c: ConsentRecord): ConsentRecordRow {
  return {
    id: c.id,
    care_circle_id: c.careCircleId,
    subject_user_id: c.subjectUserId,
    consent_type: c.consentType,
    policy_version: c.policyVersion,
    status: c.status,
    granted_at: c.grantedAt,
    revoked_at: c.revokedAt,
    recorded_by: c.recordedBy,
  };
}
export function rowToConsentRecord(r: ConsentRecordRow): ConsentRecord {
  return {
    id: r.id,
    careCircleId: r.care_circle_id,
    subjectUserId: r.subject_user_id,
    consentType: r.consent_type,
    policyVersion: r.policy_version,
    status: r.status,
    grantedAt: toIsoNullable(r.granted_at),
    revokedAt: toIsoNullable(r.revoked_at),
    recordedBy: r.recorded_by,
  };
}

export type NotificationPreferenceRow = {
  id: string;
  user_id: string;
  care_circle_id: string;
  channel: NotificationPreference["channel"];
  enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  urgent_alerts_override_quiet_hours: boolean;
  created_at: string;
  updated_at: string;
};
export function notificationPreferenceToRow(p: NotificationPreference): NotificationPreferenceRow {
  return {
    id: p.id,
    user_id: p.userId,
    care_circle_id: p.careCircleId,
    channel: p.channel,
    enabled: p.enabled,
    quiet_hours_start: p.quietHoursStart,
    quiet_hours_end: p.quietHoursEnd,
    timezone: p.timezone,
    urgent_alerts_override_quiet_hours: p.urgentAlertsOverrideQuietHours,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
export function rowToNotificationPreference(r: NotificationPreferenceRow): NotificationPreference {
  return {
    id: r.id,
    userId: r.user_id,
    careCircleId: r.care_circle_id,
    channel: r.channel,
    enabled: r.enabled,
    quietHoursStart: r.quiet_hours_start,
    quietHoursEnd: r.quiet_hours_end,
    timezone: r.timezone,
    urgentAlertsOverrideQuietHours: r.urgent_alerts_override_quiet_hours,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

/**
 * Postgres `timestamptz` columns come back from PostgREST as
 * `2026-01-01T00:00:00+00:00`, not the `...Z` suffix the domain layer's
 * entities and builders use everywhere. Normalise on read so round-trips
 * are exact and callers never see the offset form.
 */
function toIso(value: string): string {
  return new Date(value).toISOString();
}

function toIsoNullable(value: string | null): string | null {
  return value === null ? null : toIso(value);
}
