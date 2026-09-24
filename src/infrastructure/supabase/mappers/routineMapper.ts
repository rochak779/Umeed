import type { Routine, EscalationPolicy } from "@/domain/entities/routine.ts";

export type RoutineRow = {
  id: string;
  care_circle_id: string;
  older_adult_id: string | null;
  type: Routine["type"];
  title: string;
  description: string | null;
  timezone: string;
  local_time: string;
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  grace_period_minutes: number;
  visibility: Routine["visibility"];
  enabled: boolean;
  notification_channels: Routine["notificationChannels"];
  created_by: string;
  created_at: string;
  updated_at: string;
};
export function routineToRow(r: Routine): RoutineRow {
  return {
    id: r.id,
    care_circle_id: r.careCircleId,
    older_adult_id: r.olderAdultId,
    type: r.type,
    title: r.title,
    description: r.description,
    timezone: r.timezone,
    local_time: r.localTime,
    days_of_week: r.daysOfWeek,
    start_date: r.startDate,
    end_date: r.endDate,
    grace_period_minutes: r.gracePeriodMinutes,
    visibility: r.visibility,
    enabled: r.enabled,
    notification_channels: r.notificationChannels,
    created_by: r.createdBy,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}
export function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    careCircleId: row.care_circle_id,
    olderAdultId: row.older_adult_id,
    type: row.type,
    title: row.title,
    description: row.description,
    timezone: row.timezone,
    localTime: row.local_time,
    daysOfWeek: row.days_of_week,
    startDate: row.start_date,
    endDate: row.end_date,
    gracePeriodMinutes: row.grace_period_minutes,
    visibility: row.visibility,
    enabled: row.enabled,
    notificationChannels: row.notification_channels,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export type EscalationPolicyRow = {
  id: string;
  routine_id: string;
  name: string;
  enabled: boolean;
  steps: EscalationPolicy["steps"];
  created_at: string;
  updated_at: string;
};
export function escalationPolicyToRow(p: EscalationPolicy): EscalationPolicyRow {
  return {
    id: p.id,
    routine_id: p.routineId,
    name: p.name,
    enabled: p.enabled,
    steps: p.steps,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
export function rowToEscalationPolicy(row: EscalationPolicyRow): EscalationPolicy {
  return {
    id: row.id,
    routineId: row.routine_id,
    name: row.name,
    enabled: row.enabled,
    steps: row.steps,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
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
