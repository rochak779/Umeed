import type {
  CareCircleRepository,
  ConsentRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { PermissionDeniedError } from "../../domain/errors/DomainError";
import type { ConsentStatus, ConsentType } from "../../domain/entities/consent";

export type SetConsentDeps = {
  careCircles: CareCircleRepository;
  consents: ConsentRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * The older adult's consent/privacy controls (Implementation.md §7.11):
 * whether the nearby responder can see her address, whether automated calls
 * are enabled, and other per-circle sharing decisions. Only she can set
 * these — not the coordinator (§3.1 "Independence before surveillance").
 */
export async function setConsent(
  deps: SetConsentDeps,
  input: {
    careCircleId: string;
    actorUserId: string;
    consentType: ConsentType;
    status: ConsentStatus;
  },
): Promise<void> {
  const circle = await deps.careCircles.findById(input.careCircleId);
  if (circle?.olderAdultId !== input.actorUserId) {
    throw new PermissionDeniedError("older_adult_consent");
  }

  const nowIso = deps.clock.now().toISOString();
  const existing = (await deps.consents.findByCareCircle(input.careCircleId)).find(
    (r) => r.subjectUserId === input.actorUserId && r.consentType === input.consentType,
  );
  const recordId = existing?.id ?? deps.idGenerator.nextId();
  await deps.consents.save({
    id: recordId,
    careCircleId: input.careCircleId,
    subjectUserId: input.actorUserId,
    consentType: input.consentType,
    policyVersion: "1.0",
    status: input.status,
    grantedAt: input.status === "granted" ? nowIso : null,
    revokedAt: input.status === "revoked" ? nowIso : null,
    recordedBy: input.actorUserId,
  });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "consent.updated",
    entityType: "ConsentRecord",
    entityId: recordId,
    timestamp: nowIso,
    metadata: { consentType: input.consentType, status: input.status },
  });
}
