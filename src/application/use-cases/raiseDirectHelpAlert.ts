import type {
  CareCircleRepository,
  AlertRepository,
  AuditRepository,
  CommunicationRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import type { NotificationGateway } from "../ports/infra";
import { PermissionDeniedError } from "../../domain/errors/DomainError";
import type { Alert, AlertRecipient } from "../../domain/entities/alert";
import { sendAlertNotifications } from "../services/sendAlertNotifications";

export type RaiseDirectHelpAlertDeps = {
  careCircles: CareCircleRepository;
  alerts: AlertRepository;
  audit: AuditRepository;
  communications: CommunicationRepository;
  notificationGateway: NotificationGateway;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * "I need help" (Implementation.md §10 "Direct help behaviour"): skip the
 * normal reminder/retry stages entirely and notify the coordinator and every
 * nearby responder immediately. Umeed never calls 999/111 itself — the UI
 * layer shows those numbers as links, it never dials them.
 */
export async function raiseDirectHelpAlert(
  deps: RaiseDirectHelpAlertDeps,
  input: { olderAdultUserId: string },
): Promise<{ ok: true; alertId: string }> {
  const circles = await deps.careCircles.findByUserId(input.olderAdultUserId);
  const ownCircle = circles.find((c) => c.olderAdultId === input.olderAdultUserId);
  if (!ownCircle) throw new PermissionDeniedError("direct_help_own_circle_only");

  const nowIso = deps.clock.now().toISOString();
  const alert: Alert = {
    id: deps.idGenerator.nextId(),
    careCircleId: ownCircle.id,
    occurrenceId: null,
    source: "direct_help",
    status: "unclaimed",
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

  const members = await deps.careCircles.findMembers(ownCircle.id);
  const immediateRecipients = members.filter(
    (m) =>
      m.responderType === "coordinator" || (m.responderType === "nearby_responder" && m.isNearby),
  );
  const savedRecipients: AlertRecipient[] = [];
  for (const member of immediateRecipients) {
    const recipient: AlertRecipient = {
      id: deps.idGenerator.nextId(),
      alertId: alert.id,
      circleMemberId: member.id,
      channel: member.preferredChannel,
      stage: 1,
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
    occurrenceId: null,
    recipients: savedRecipients,
    templateId: "direct_help_requested",
    templateData: {},
  });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: ownCircle.id,
    actorId: input.olderAdultUserId,
    actorType: "user",
    action: "alert.opened",
    entityType: "Alert",
    entityId: alert.id,
    timestamp: nowIso,
    metadata: { source: "direct_help" },
  });

  return { ok: true, alertId: alert.id };
}
