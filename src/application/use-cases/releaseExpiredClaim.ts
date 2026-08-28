import type {
  AlertRepository,
  AuditRepository,
  OccurrenceRepository,
  RoutineRepository,
  CareCircleRepository,
  CommunicationRepository,
} from "../ports/repositories";
import type { NotificationGateway } from "../ports/infra";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { transitionAlert } from "../../domain/state-machines/alertStateMachine";
import { getEscalationStepForStage } from "../../domain/policies/escalationStageLookup";
import { selectNextRecipients } from "../../domain/policies/escalationRecipients";
import { sendAlertNotifications } from "../services/sendAlertNotifications";
import type { AlertRecipient } from "../../domain/entities/alert";

export type ReleaseExpiredClaimDeps = {
  alerts: AlertRepository;
  occurrences: OccurrenceRepository;
  routines: RoutineRepository;
  careCircles: CareCircleRepository;
  communications: CommunicationRepository;
  notificationGateway: NotificationGateway;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ReleaseExpiredClaimResult = { ok: true; released: boolean };

/**
 * Claim expiry (Implementation.md §9.3, §10 steps 6-8): releases the claim,
 * advances to the next escalation stage and notifies its recipients, or —
 * if the sequence is exhausted — marks the alert unresolved so the UI shows
 * urgent human-action guidance. Direct-help alerts have no occurrenceId and
 * therefore no escalation policy to advance through; they just release.
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

  const nextStage = alert.currentStage + 1;

  await deps.alerts.save({
    ...alert,
    status: transitionAlert(alert.status, "unclaimed"),
    claimedBy: null,
    claimedAt: null,
    claimExpiresAt: null,
    currentStage: nextStage,
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

  if (!alert.occurrenceId) {
    return { ok: true, released: true };
  }

  const occurrence = await deps.occurrences.findById(alert.occurrenceId);
  const routine = occurrence ? await deps.routines.findById(occurrence.routineId) : null;
  const policy = routine ? await deps.routines.findEscalationPolicy(routine.id) : null;
  if (!routine || !policy) {
    return { ok: true, released: true };
  }

  const nextStep = getEscalationStepForStage(policy, nextStage);

  if (!nextStep) {
    const unresolvedAlert = await deps.alerts.findById(alert.id);
    if (unresolvedAlert) {
      await deps.alerts.save({
        ...unresolvedAlert,
        status: transitionAlert(unresolvedAlert.status, "unresolved"),
        updatedAt: nowIso,
      });
      await deps.audit.append({
        id: deps.idGenerator.nextId(),
        careCircleId: alert.careCircleId,
        actorId: "system",
        actorType: "system",
        action: "alert.unresolved",
        entityType: "Alert",
        entityId: alert.id,
        timestamp: nowIso,
        metadata: {},
      });
    }
    return { ok: true, released: true };
  }

  const members = await deps.careCircles.findMembers(routine.careCircleId);
  const targetMembers =
    nextStep.fallbackBehaviour === "notify_all_remaining"
      ? members.filter((m) => m.responderType === "family" || m.responderType === "coordinator")
      : selectNextRecipients(members, nextStep, nowIso, routine.timezone);

  const savedRecipients: AlertRecipient[] = [];
  for (const member of targetMembers) {
    const recipient: AlertRecipient = {
      id: deps.idGenerator.nextId(),
      alertId: alert.id,
      circleMemberId: member.id,
      channel: nextStep.channel,
      stage: nextStage,
      deliveryStatus: "queued",
      providerReference: null,
      sentAt: null,
      deliveredAt: null,
      respondedAt: null,
      response: null,
    };
    await deps.alerts.saveRecipient(recipient);
    savedRecipients.push(recipient);
  }
  await sendAlertNotifications(deps, {
    alertId: alert.id,
    occurrenceId: alert.occurrenceId,
    recipients: savedRecipients,
    templateId: "welfare_check_escalated",
    templateData: { routineTitle: routine.title },
  });

  return { ok: true, released: true };
}
