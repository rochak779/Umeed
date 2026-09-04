import type { CommunicationEvent } from "@/domain/entities/alert";

export type CommunicationEventRow = {
  id: string;
  alert_id: string | null;
  occurrence_id: string | null;
  recipient_id: string;
  channel: CommunicationEvent["channel"];
  direction: CommunicationEvent["direction"];
  provider_reference: string | null;
  status: CommunicationEvent["status"];
  attempt_number: number;
  error_code: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export function communicationEventToRow(e: CommunicationEvent): CommunicationEventRow {
  return {
    id: e.id,
    alert_id: e.alertId,
    occurrence_id: e.occurrenceId,
    recipient_id: e.recipientId,
    channel: e.channel,
    direction: e.direction,
    provider_reference: e.providerReference,
    status: e.status,
    attempt_number: e.attemptNumber,
    error_code: e.errorCode,
    idempotency_key: e.idempotencyKey,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export function rowToCommunicationEvent(row: CommunicationEventRow): CommunicationEvent {
  return {
    id: row.id,
    alertId: row.alert_id,
    occurrenceId: row.occurrence_id,
    recipientId: row.recipient_id,
    channel: row.channel,
    direction: row.direction,
    providerReference: row.provider_reference,
    status: row.status,
    attemptNumber: row.attempt_number,
    errorCode: row.error_code,
    idempotencyKey: row.idempotency_key,
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
