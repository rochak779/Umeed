import type { AlertRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { transitionAlert } from "../../domain/state-machines/alertStateMachine";

export type ReleaseExpiredClaimDeps = {
  alerts: AlertRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ReleaseExpiredClaimResult = { ok: true; released: boolean };

/**
 * Claim expiry (Implementation.md §9.3: "When a claim expires, record an
 * audit event and resume escalation"). Advances currentStage so the next
 * escalation tier can be notified — the actual notification dispatch is
 * Phase 6's job; this just makes the stage advance observable and audited.
 */
export async function releaseExpiredClaim(
  deps: ReleaseExpiredClaimDeps,
  input: { alertId: string },
): Promise<ReleaseExpiredClaimResult> {
  const alert = await deps.alerts.findById(input.alertId);
  if (!alert || alert.status !== "claimed" || !alert.claimExpiresAt) {
    return { ok: true, released: false };
  }

  const nowIso = deps.clock.now().toISOString();
  if (nowIso < alert.claimExpiresAt) {
    return { ok: true, released: false };
  }

  await deps.alerts.save({
    ...alert,
    status: transitionAlert(alert.status, "unclaimed"),
    claimedBy: null,
    claimedAt: null,
    claimExpiresAt: null,
    currentStage: alert.currentStage + 1,
    updatedAt: nowIso,
  });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: alert.careCircleId,
    actorId: "system",
    actorType: "system",
    action: "alert.claim_expired",
    entityType: "Alert",
    entityId: alert.id,
    timestamp: nowIso,
    metadata: {},
  });

  return { ok: true, released: true };
}
