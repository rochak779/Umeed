import type {
  CareCircleRepository,
  InvitationRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { hashToken } from "../../shared/token/hashToken";
import { assertPermission } from "../../domain/policies/permissionGuard";
import type { ResponderType } from "../../domain/entities/careCircle";
import type { Invitation } from "../../domain/entities/invitation";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type InviteMemberDeps = {
  careCircles: CareCircleRepository;
  invitations: InvitationRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type InviteMemberInput = {
  careCircleId: string;
  actorUserId: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  proposedResponderType: Exclude<ResponderType, "older_adult" | "coordinator">;
  proposedRelationship: string;
};

/**
 * Invite an additional family member or nearby responder into an existing
 * circle (Implementation.md §7.8 "Invite additional family or trusted
 * nearby responders"). Requires canManageCircle — enforced here, not just
 * hidden in the UI (§13.3).
 */
export async function inviteMember(
  deps: InviteMemberDeps,
  input: InviteMemberInput,
): Promise<{ ok: true; plaintextToken: string }> {
  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    input.careCircleId,
  );
  const actorPermission = actorMember
    ? await deps.careCircles.findPermission(actorMember.id)
    : null;
  assertPermission(actorPermission, "canManageCircle");

  const nowIso = deps.clock.now().toISOString();
  const plaintextToken = deps.idGenerator.nextId();
  const invitation: Invitation = {
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    invitedByUserId: input.actorUserId,
    invitedEmail: input.invitedEmail,
    invitedPhone: input.invitedPhone,
    proposedResponderType: input.proposedResponderType,
    proposedRelationship: input.proposedRelationship,
    tokenHash: hashToken(plaintextToken),
    status: "pending",
    expiresAt: new Date(deps.clock.now().getTime() + INVITATION_TTL_MS).toISOString(),
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
    createdAt: nowIso,
  };
  await deps.invitations.save(invitation);

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "invitation.sent",
    entityType: "Invitation",
    entityId: invitation.id,
    timestamp: nowIso,
    metadata: { proposedResponderType: input.proposedResponderType },
  });

  return { ok: true, plaintextToken };
}
