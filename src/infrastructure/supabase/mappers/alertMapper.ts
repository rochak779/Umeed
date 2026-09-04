import type { Alert, AlertRecipient } from "@/domain/entities/alert.ts";

export type AlertRow = {
  id: string;
  care_circle_id: string;
  occurrence_id: string | null;
  source: Alert["source"];
  status: Alert["status"];
  severity: Alert["severity"];
  current_stage: number;
  opened_at: string;
  claimed_at: string | null;
  claimed_by: string | null;
  claim_expires_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_code: Alert["resolutionCode"];
  resolution_note: string | null;
  updated_at: string;
};

export function alertToRow(a: Alert): AlertRow {
  return {
    id: a.id,
    care_circle_id: a.careCircleId,
    occurrence_id: a.occurrenceId,
    source: a.source,
    status: a.status,
    severity: a.severity,
    current_stage: a.currentStage,
    opened_at: a.openedAt,
    claimed_at: a.claimedAt,
    claimed_by: a.claimedBy,
    claim_expires_at: a.claimExpiresAt,
    resolved_at: a.resolvedAt,
    resolved_by: a.resolvedBy,
    resolution_code: a.resolutionCode,
    resolution_note: a.resolutionNote,
    updated_at: a.updatedAt,
  };
}

export function rowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    careCircleId: row.care_circle_id,
    occurrenceId: row.occurrence_id,
    source: row.source,
    status: row.status,
    severity: row.severity,
    currentStage: row.current_stage,
    openedAt: toIso(row.opened_at),
    claimedAt: toIsoNullable(row.claimed_at),
    claimedBy: row.claimed_by,
    claimExpiresAt: toIsoNullable(row.claim_expires_at),
    resolvedAt: toIsoNullable(row.resolved_at),
    resolvedBy: row.resolved_by,
    resolutionCode: row.resolution_code,
    resolutionNote: row.resolution_note,
    updatedAt: toIso(row.updated_at),
  };
}

export type AlertRecipientRow = {
  id: string;
  alert_id: string;
  circle_member_id: string;
  channel: AlertRecipient["channel"];
  stage: number;
  delivery_status: AlertRecipient["deliveryStatus"];
  provider_reference: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  responded_at: string | null;
  response: string | null;
};

export function alertRecipientToRow(r: AlertRecipient): AlertRecipientRow {
  return {
    id: r.id,
    alert_id: r.alertId,
    circle_member_id: r.circleMemberId,
    channel: r.channel,
    stage: r.stage,
    delivery_status: r.deliveryStatus,
    provider_reference: r.providerReference,
    sent_at: r.sentAt,
    delivered_at: r.deliveredAt,
    responded_at: r.respondedAt,
    response: r.response,
  };
}

export function rowToAlertRecipient(row: AlertRecipientRow): AlertRecipient {
  return {
    id: row.id,
    alertId: row.alert_id,
    circleMemberId: row.circle_member_id,
    channel: row.channel,
    stage: row.stage,
    deliveryStatus: row.delivery_status,
    providerReference: row.provider_reference,
    sentAt: toIsoNullable(row.sent_at),
    deliveredAt: toIsoNullable(row.delivered_at),
    respondedAt: toIsoNullable(row.responded_at),
    response: row.response,
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
