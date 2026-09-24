import type {
  CareCircleRepository,
  InvitationRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { hashToken } from "../../shared/token/hashToken";
import { defaultPermissionsFor, type CareCircle } from "../../domain/entities/careCircle";
import type { Invitation } from "../../domain/entities/invitation";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type StartCareCircleDeps = {
  careCircleRepository: CareCircleRepository;
  invitationRepository: InvitationRepository;
  auditRepository: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type StartCareCircleInput = {
  coordinatorUserId: string;
  olderAdultPreferredName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
};

export type StartCareCircleResult = {
  circle: CareCircle;
  invitation: Invitation;
  /** Shown to the coordinator once, as a link/manual code — never persisted. */
  plaintextToken: string;
};

/**
 * Coordinator onboarding step 1 (Implementation.md §7.3): create the circle
 * in `pending_consent`, add the coordinator as its first active member, and
 * invite the older adult. Escalation stays inactive until the older adult's
 * consent is recorded via acceptInvitation.
 */
export async function startCareCircle(
  deps: StartCareCircleDeps,
  input: StartCareCircleInput,
): Promise<StartCareCircleResult> {
  const nowIso = deps.clock.now().toISOString();

  const circle: CareCircle = {
    id: deps.idGenerator.nextId(),
    name: `${input.olderAdultPreferredName}'s circle`,
    olderAdultId: null,
    coordinatorId: input.coordinatorUserId,
    status: "pending_consent",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await deps.careCircleRepository.save(circle);

  const coordinatorMemberId = deps.idGenerator.nextId();
  await deps.careCircleRepository.saveMember({
    id: coordinatorMemberId,
    careCircleId: circle.id,
    userId: input.coordinatorUserId,
    relationship: "coordinator",
    responderType: "coordinator",
    isNearby: false,
    priority: 0,
    availability: null,
    preferredChannel: "in_app",
    membershipStatus: "active",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await deps.careCircleRepository.savePermission({
    id: deps.idGenerator.nextId(),
    circleMemberId: coordinatorMemberId,
    ...defaultPermissionsFor("coordinator"),
    grantedAt: nowIso,
    revokedAt: null,
  });

  const plaintextToken = deps.idGenerator.nextId();
  const invitation: Invitation = {
    id: deps.idGenerator.nextId(),
    careCircleId: circle.id,
    invitedByUserId: input.coordinatorUserId,
    invitedEmail: input.invitedEmail,
    invitedPhone: input.invitedPhone,
    proposedResponderType: "older_adult",
    proposedRelationship: "self",
    tokenHash: hashToken(plaintextToken),
    status: "pending",
    expiresAt: new Date(deps.clock.now().getTime() + INVITATION_TTL_MS).toISOString(),
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
    createdAt: nowIso,
  };
  await deps.invitationRepository.save(invitation);

  await deps.auditRepository.append({
    id: deps.idGenerator.nextId(),
    careCircleId: circle.id,
    actorId: input.coordinatorUserId,
    actorType: "user",
    action: "care_circle.created",
    entityType: "CareCircle",
    entityId: circle.id,
    timestamp: nowIso,
    metadata: {},
  });

  return { circle, invitation, plaintextToken };
}
