import type { AlertRecipient, CommunicationEvent } from "../../domain/entities/alert.ts";
import type { Clock } from "../../shared/time/Clock.ts";
import type { IdGenerator } from "../../shared/id/IdGenerator.ts";
import type { NotificationGateway } from "../ports/infra.ts";

export type SendAlertNotificationsDeps = {
  alerts: { saveRecipient(recipient: AlertRecipient): Promise<void> };
  communications: {
    findByIdempotencyKey(key: string): Promise<CommunicationEvent | null>;
    save(event: CommunicationEvent): Promise<void>;
  };
  notificationGateway: NotificationGateway;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Shared dispatch step used by every place an alert opens or advances a
 * stage (raiseMissedRoutineAlert, raiseDirectHelpAlert, and the escalation
 * continuation in releaseExpiredClaim). Idempotency key is
 * `${alertId}:${recipientId}:${stage}` so re-running the same escalation
 * step twice (e.g. duplicate scheduler tick) never double-sends
 * (Implementation.md §12).
 */
export async function sendAlertNotifications(
  deps: SendAlertNotificationsDeps,
  input: {
    alertId: string;
    occurrenceId: string | null;
    recipients: AlertRecipient[];
    templateId: string;
    templateData: Record<string, string>;
  },
): Promise<void> {
  for (const recipient of input.recipients) {
    const idempotencyKey = `${input.alertId}:${recipient.id}:${recipient.stage}`;
    const existing = await deps.communications.findByIdempotencyKey(idempotencyKey);
    if (existing) continue;

    const nowIso = deps.clock.now().toISOString();
    const result = await deps.notificationGateway.send({
      channel: recipient.channel,
      recipientId: recipient.circleMemberId,
      idempotencyKey,
      templateId: input.templateId,
      templateData: input.templateData,
    });

    await deps.communications.save({
      id: deps.idGenerator.nextId(),
      alertId: input.alertId,
      occurrenceId: input.occurrenceId,
      recipientId: recipient.circleMemberId,
      channel: recipient.channel,
      direction: "outbound",
      providerReference: result.providerReference,
      status: result.status,
      attemptNumber: 1,
      errorCode: result.status === "failed" ? "provider_failure" : null,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (recipient.channel === "voice" && result.status === "failed") {
      const fallbackKey = `${idempotencyKey}:sms_fallback`;
      const fallbackResult = await deps.notificationGateway.send({
        channel: "sms",
        recipientId: recipient.circleMemberId,
        idempotencyKey: fallbackKey,
        templateId: input.templateId,
        templateData: input.templateData,
      });
      const fallbackNowIso = deps.clock.now().toISOString();
      await deps.communications.save({
        id: deps.idGenerator.nextId(),
        alertId: input.alertId,
        occurrenceId: input.occurrenceId,
        recipientId: recipient.circleMemberId,
        channel: "sms",
        direction: "outbound",
        providerReference: fallbackResult.providerReference,
        status: fallbackResult.status,
        attemptNumber: 1,
        errorCode: fallbackResult.status === "failed" ? "provider_failure" : null,
        idempotencyKey: fallbackKey,
        createdAt: fallbackNowIso,
        updatedAt: fallbackNowIso,
      });

      await deps.alerts.saveRecipient({
        ...recipient,
        deliveryStatus: fallbackResult.status === "failed" ? "failed" : "sent",
        providerReference: fallbackResult.providerReference,
        sentAt: fallbackNowIso,
      });
      continue;
    }

    await deps.alerts.saveRecipient({
      ...recipient,
      deliveryStatus: result.status === "failed" ? "failed" : "sent",
      providerReference: result.providerReference,
      sentAt: nowIso,
    });
  }
}
