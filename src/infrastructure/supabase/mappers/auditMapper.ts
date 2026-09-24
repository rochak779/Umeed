import type { AuditEvent } from "@/domain/entities/consent.ts";

export type AuditEventRow = {
  id: string;
  care_circle_id: string;
  actor_id: string;
  actor_type: AuditEvent["actorType"];
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export function auditEventToRow(e: AuditEvent): AuditEventRow {
  return {
    id: e.id,
    care_circle_id: e.careCircleId,
    actor_id: e.actorId,
    actor_type: e.actorType,
    action: e.action,
    entity_type: e.entityType,
    entity_id: e.entityId,
    timestamp: e.timestamp,
    metadata: e.metadata,
  };
}

export function rowToAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    careCircleId: row.care_circle_id,
    actorId: row.actor_id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    timestamp: toIso(row.timestamp),
    metadata: row.metadata,
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
