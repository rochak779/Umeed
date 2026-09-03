import type { CareCircle, CircleMember, MemberPermission } from "@/domain/entities/careCircle";

export type CareCircleRow = {
  id: string;
  name: string;
  older_adult_id: string | null;
  coordinator_id: string;
  status: CareCircle["status"];
  created_at: string;
  updated_at: string;
};
export function careCircleToRow(c: CareCircle): CareCircleRow {
  return {
    id: c.id,
    name: c.name,
    older_adult_id: c.olderAdultId,
    coordinator_id: c.coordinatorId,
    status: c.status,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}
export function rowToCareCircle(r: CareCircleRow): CareCircle {
  return {
    id: r.id,
    name: r.name,
    olderAdultId: r.older_adult_id,
    coordinatorId: r.coordinator_id,
    status: r.status,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export type CircleMemberRow = {
  id: string;
  care_circle_id: string;
  user_id: string;
  relationship: string;
  responder_type: CircleMember["responderType"];
  is_nearby: boolean;
  priority: number;
  availability_days_of_week: number[] | null;
  availability_start_local_time: string | null;
  availability_end_local_time: string | null;
  preferred_channel: CircleMember["preferredChannel"];
  membership_status: CircleMember["membershipStatus"];
  created_at: string;
  updated_at: string;
};
export function circleMemberToRow(m: CircleMember): CircleMemberRow {
  return {
    id: m.id,
    care_circle_id: m.careCircleId,
    user_id: m.userId,
    relationship: m.relationship,
    responder_type: m.responderType,
    is_nearby: m.isNearby,
    priority: m.priority,
    availability_days_of_week: m.availability?.daysOfWeek ?? null,
    availability_start_local_time: m.availability?.startLocalTime ?? null,
    availability_end_local_time: m.availability?.endLocalTime ?? null,
    preferred_channel: m.preferredChannel,
    membership_status: m.membershipStatus,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}
export function rowToCircleMember(r: CircleMemberRow): CircleMember {
  return {
    id: r.id,
    careCircleId: r.care_circle_id,
    userId: r.user_id,
    relationship: r.relationship,
    responderType: r.responder_type,
    isNearby: r.is_nearby,
    priority: r.priority,
    availability:
      r.availability_start_local_time && r.availability_end_local_time
        ? {
            daysOfWeek: r.availability_days_of_week ?? [],
            startLocalTime: r.availability_start_local_time,
            endLocalTime: r.availability_end_local_time,
          }
        : null,
    preferredChannel: r.preferred_channel,
    membershipStatus: r.membership_status,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export type MemberPermissionRow = {
  id: string;
  circle_member_id: string;
  can_view_routine_status: boolean;
  can_view_routine_names: boolean;
  can_view_medication_labels: boolean;
  can_view_notes: boolean;
  can_view_address: boolean;
  can_receive_alerts: boolean;
  can_manage_routines: boolean;
  can_manage_circle: boolean;
  granted_at: string;
  revoked_at: string | null;
};
export function memberPermissionToRow(p: MemberPermission): MemberPermissionRow {
  return {
    id: p.id,
    circle_member_id: p.circleMemberId,
    can_view_routine_status: p.canViewRoutineStatus,
    can_view_routine_names: p.canViewRoutineNames,
    can_view_medication_labels: p.canViewMedicationLabels,
    can_view_notes: p.canViewNotes,
    can_view_address: p.canViewAddress,
    can_receive_alerts: p.canReceiveAlerts,
    can_manage_routines: p.canManageRoutines,
    can_manage_circle: p.canManageCircle,
    granted_at: p.grantedAt,
    revoked_at: p.revokedAt,
  };
}
export function rowToMemberPermission(r: MemberPermissionRow): MemberPermission {
  return {
    id: r.id,
    circleMemberId: r.circle_member_id,
    canViewRoutineStatus: r.can_view_routine_status,
    canViewRoutineNames: r.can_view_routine_names,
    canViewMedicationLabels: r.can_view_medication_labels,
    canViewNotes: r.can_view_notes,
    canViewAddress: r.can_view_address,
    canReceiveAlerts: r.can_receive_alerts,
    canManageRoutines: r.can_manage_routines,
    canManageCircle: r.can_manage_circle,
    grantedAt: toIso(r.granted_at),
    revokedAt: toIsoNullable(r.revoked_at),
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
