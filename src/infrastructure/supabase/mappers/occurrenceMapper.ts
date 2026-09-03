import type { RoutineOccurrence } from "@/domain/entities/routine";

export type OccurrenceRow = {
  id: string;
  routine_id: string;
  scheduled_for_utc: string;
  scheduled_local_date: string;
  status: RoutineOccurrence["status"];
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledgement_channel: RoutineOccurrence["acknowledgementChannel"];
  alert_id: string | null;
  created_at: string;
  updated_at: string;
};
export function occurrenceToRow(o: RoutineOccurrence): OccurrenceRow {
  return {
    id: o.id,
    routine_id: o.routineId,
    scheduled_for_utc: o.scheduledForUtc,
    scheduled_local_date: o.scheduledLocalDate,
    status: o.status,
    acknowledged_at: o.acknowledgedAt,
    acknowledged_by: o.acknowledgedBy,
    acknowledgement_channel: o.acknowledgementChannel,
    alert_id: o.alertId,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}
export function rowToOccurrence(row: OccurrenceRow): RoutineOccurrence {
  return {
    id: row.id,
    routineId: row.routine_id,
    scheduledForUtc: toIso(row.scheduled_for_utc),
    scheduledLocalDate: row.scheduled_local_date,
    status: row.status,
    acknowledgedAt: toIsoNullable(row.acknowledged_at),
    acknowledgedBy: row.acknowledged_by,
    acknowledgementChannel: row.acknowledgement_channel,
    alertId: row.alert_id,
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

function toIsoNullable(value: string | null): string | null {
  return value === null ? null : toIso(value);
}
