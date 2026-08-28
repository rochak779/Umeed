import type {
  OccurrenceRepository,
  RoutineRepository,
  CareCircleRepository,
  AlertRepository,
  AuditRepository,
  CommunicationRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import type { NotificationGateway } from "../ports/infra";
import { transitionOccurrence } from "../../domain/state-machines/occurrenceStateMachine";
import { transitionAlert } from "../../domain/state-machines/alertStateMachine";
import { selectNextRecipients } from "../../domain/policies/escalationRecipients";
import type { Alert, AlertRecipient } from "../../domain/entities/alert";
import { sendAlertNotifications } from "../services/sendAlertNotifications";

export type RaiseMissedRoutineAlertDeps = {
  occurrences: OccurrenceRepository;
  routines: RoutineRepository;
  careCircles: CareCircleRepository;
  alerts: AlertRepository;
  audit: AuditRepository;
  communications: CommunicationRepository;
  notificationGateway: NotificationGateway;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type RaiseMissedRoutineAlertResult =
  | { ok: true; alertId: string }
  | { ok: false; reason: "not_yet_due" | "already_resolved" | "not_found" };

const OPEN_OCCURRENCE_STATUSES = new Set(["scheduled", "awaiting_response"]);

/**
 * The escalation engine's entry point (Implementation.md §10 step 3 onward):
 * once a routine's grace period has fully elapsed with no acknowledgement,
 * mark it missed and open an alert for the family/nearby-responder tier of
 * the escalation policy. Idempotent — calling this again on an
 * already-missed/escalating/resolved occurrence is a no-op, so a scheduler
 * can poll safely (Implementation.md §12).
 */
export async function raiseMissedRoutineAlert(
  deps: RaiseMissedRoutineAlertDeps,
  input: { occurrenceId: string },
): Promise<RaiseMissedRoutineAlertResult> {
  const occurrence = await deps.occurrences.findById(input.occurrenceId);
  if (!occurrence) return { ok: false, reason: "not_found" };
  if (!OPEN_OCCURRENCE_STATUSES.has(occurrence.status)) {
    return { ok: false, reason: "already_resolved" };
  }

  const routine = await deps.routines.findById(occurrence.routineId);
  if (!routine) return { ok: false, reason: "not_found" };

  const nowIso = deps.clock.now().toISOString();
  const dueAt = new Date(
    new Date(occurrence.scheduledForUtc).getTime() + routine.gracePeriodMinutes * 60_000,
  ).toISOString();
  if (nowIso < dueAt) return { ok: false, reason: "not_yet_due" };

  const missedStatus =
    occurrence.status === "scheduled"
      ? transitionOccurrence(transitionOccurrence(occurrence.status, "awaiting_response"), "missed")
      : transitionOccurrence(occurrence.status, "missed");

  await deps.occurrences.save({ ...occurrence, status: missedStatus, updatedAt: nowIso });

  const alert: Alert = {
    id: deps.idGenerator.nextId(),
    careCircleId: routine.careCircleId,
    occurrenceId: occurrence.id,
    source: "missed_routine",
    status: transitionAlert(transitionAlert("open", "notifying"), "unclaimed"),
    severity: "urgent",
    currentStage: 1,
    openedAt: nowIso,
    claimedAt: null,
    claimedBy: null,
    claimExpiresAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionCode: null,
    resolutionNote: null,
    updatedAt: nowIso,
  };
  await deps.alerts.save(alert);

  const policy = await deps.routines.findEscalationPolicy(routine.id);
  const firstResponderStep = policy?.steps.find((s) => s.recipientType !== "older_adult");
  if (firstResponderStep) {
    const members = await deps.careCircles.findMembers(routine.careCircleId);
    const recipients = selectNextRecipients(members, firstResponderStep, nowIso, routine.timezone);
    const savedRecipients: AlertRecipient[] = [];
    for (const member of recipients) {
      const recipient: AlertRecipient = {
        id: deps.idGenerator.nextId(),
        alertId: alert.id,
        circleMemberId: member.id,
        channel: firstResponderStep.channel,
        stage: alert.currentStage,
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
      occurrenceId: occurrence.id,
      recipients: savedRecipients,
      templateId: "welfare_check_requested",
      templateData: { routineTitle: routine.title },
    });
  }

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: routine.careCircleId,
    actorId: "system",
    actorType: "system",
    action: "alert.opened",
    entityType: "Alert",
    entityId: alert.id,
    timestamp: nowIso,
    metadata: { source: "missed_routine", occurrenceId: occurrence.id },
  });

  return { ok: true, alertId: alert.id };
}
