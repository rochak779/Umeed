import type {
  CareCircleRepository,
  InvitationRepository,
  ConsentRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { hashToken } from "../../shared/token/hashToken";
import { defaultPermissionsFor } from "../../domain/entities/careCircle";

export type AcceptInvitationDeps = {
  careCircleRepository: CareCircleRepository;
  invitationRepository: InvitationRepository;
  consentRepository: ConsentRepository;
  auditRepository: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type AcceptInvitationInput = {
  token: string;
  userId: string;
  userEmail: string;
};

export type AcceptInvitationResult =
  | { ok: true }
  | { ok: false; code: "invalid_token" | "expired" | "revoked" | "already_used" | "wrong_account" };

/**
 * Invitation acceptance (Implementation.md §7.3, §7.2 "Clear handling when an
 * invitation is expired, revoked or addressed to another account"). Joining a
 * circle always requires a valid, unexpired, unrevoked invitation plus an
 * authenticated identity check — never client-controlled role assignment.
 */
export async function acceptInvitation(
  deps: AcceptInvitationDeps,
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  const invitation = await deps.invitationRepository.findByTokenHash(hashToken(input.token));
  if (!invitation) return { ok: false, code: "invalid_token" };

  if (invitation.status === "revoked") return { ok: false, code: "revoked" };
  if (invitation.status === "accepted") return { ok: false, code: "already_used" };
  if (invitation.expiresAt <= deps.clock.now().toISOString()) return { ok: false, code: "expired" };

  if (
    invitation.invitedEmail &&
    invitation.invitedEmail.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    return { ok: false, code: "wrong_account" };
  }

  const nowIso = deps.clock.now().toISOString();
  const memberId = deps.idGenerator.nextId();

  await deps.careCircleRepository.saveMember({
    id: memberId,
    careCircleId: invitation.careCircleId,
    userId: input.userId,
    relationship: invitation.proposedRelationship,
    responderType: invitation.proposedResponderType,
    isNearby: invitation.proposedResponderType === "nearby_responder",
    priority: 0,
    availability: null,
    preferredChannel: "in_app",
    membershipStatus: "active",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await deps.careCircleRepository.savePermission({
    id: deps.idGenerator.nextId(),
    circleMemberId: memberId,
    ...defaultPermissionsFor(invitation.proposedResponderType),
    grantedAt: nowIso,
    revokedAt: null,
  });

  if (invitation.proposedResponderType === "older_adult") {
    const circle = await deps.careCircleRepository.findById(invitation.careCircleId);
    if (circle) {
      await deps.careCircleRepository.save({
        ...circle,
        olderAdultId: input.userId,
        status: "active",
        updatedAt: nowIso,
      });
    }
    await deps.consentRepository.save({
      id: deps.idGenerator.nextId(),
      careCircleId: invitation.careCircleId,
      subjectUserId: input.userId,
      consentType: "circle_participation",
      policyVersion: "1.0",
      status: "granted",
      grantedAt: nowIso,
      revokedAt: null,
      recordedBy: input.userId,
    });
  }

  await deps.invitationRepository.save({
    ...invitation,
    status: "accepted",
    acceptedByUserId: input.userId,
    acceptedAt: nowIso,
  });

  await deps.auditRepository.append({
    id: deps.idGenerator.nextId(),
    careCircleId: invitation.careCircleId,
    actorId: input.userId,
    actorType: "user",
    action: "invitation.accepted",
    entityType: "Invitation",
    entityId: invitation.id,
    timestamp: nowIso,
    metadata: { responderType: invitation.proposedResponderType },
  });

  return { ok: true };
}
