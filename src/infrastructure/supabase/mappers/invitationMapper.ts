import type { Invitation } from "@/domain/entities/invitation";

export type InvitationRow = {
  id: string;
  care_circle_id: string;
  invited_by_user_id: string;
  invited_email: string | null;
  invited_phone: string | null;
  proposed_responder_type: Invitation["proposedResponderType"];
  proposed_relationship: string;
  token_hash: string;
  status: Invitation["status"];
  expires_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function invitationToRow(invitation: Invitation): InvitationRow {
  return {
    id: invitation.id,
    care_circle_id: invitation.careCircleId,
    invited_by_user_id: invitation.invitedByUserId,
    invited_email: invitation.invitedEmail,
    invited_phone: invitation.invitedPhone,
    proposed_responder_type: invitation.proposedResponderType,
    proposed_relationship: invitation.proposedRelationship,
    token_hash: invitation.tokenHash,
    status: invitation.status,
    expires_at: invitation.expiresAt,
    accepted_by_user_id: invitation.acceptedByUserId,
    accepted_at: invitation.acceptedAt,
    revoked_at: invitation.revokedAt,
    created_at: invitation.createdAt,
  };
}

export function rowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    careCircleId: row.care_circle_id,
    invitedByUserId: row.invited_by_user_id,
    invitedEmail: row.invited_email,
    invitedPhone: row.invited_phone,
    proposedResponderType: row.proposed_responder_type,
    proposedRelationship: row.proposed_relationship,
    tokenHash: row.token_hash,
    status: row.status,
    expiresAt: toIso(row.expires_at),
    acceptedByUserId: row.accepted_by_user_id,
    acceptedAt: toIsoNullable(row.accepted_at),
    revokedAt: toIsoNullable(row.revoked_at),
    createdAt: toIso(row.created_at),
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
