import type { Channel } from "../../domain/entities/careCircle";
import type { NotificationGateway, NotificationSendResult } from "../../application/ports/infra";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";

export type MockChannelConfig = {
  /** 0..1 — probability this send simulates a provider failure. Default 0. */
  failureRate?: number;
};

export type MockDeliveryConfig = Partial<Record<Channel, MockChannelConfig>>;

export type MockCommunicationLogEntry = {
  channel: Channel;
  recipientId: string;
  idempotencyKey: string;
  templateId: string;
  status: NotificationSendResult["status"];
  providerReference: string;
  sentAt: string;
};

/**
 * Mock communication provider (Implementation.md §11.6). Simulates
 * provider-style reference IDs and configurable failure so the full
 * communication lifecycle can be exercised before Twilio (Phase 11).
 * The diagnostic log is for tests/dev tooling only — never surface it in
 * product UI.
 */
export class MockNotificationGateway implements NotificationGateway {
  private readonly log: MockCommunicationLogEntry[] = [];
  private counter = 0;

  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly config: MockDeliveryConfig = {},
  ) {}

  async send(input: {
    channel: Channel;
    recipientId: string;
    idempotencyKey: string;
    templateId: string;
    templateData: Record<string, string>;
  }): Promise<NotificationSendResult> {
    this.counter += 1;
    const failureRate = this.config[input.channel]?.failureRate ?? 0;
    const failed = failureRate >= 1 || (failureRate > 0 && Math.random() < failureRate);
    const providerReference = this.idGenerator.nextId();
    const result: NotificationSendResult = {
      providerReference,
      status: failed ? "failed" : "sent",
    };
    this.log.push({
      channel: input.channel,
      recipientId: input.recipientId,
      idempotencyKey: input.idempotencyKey,
      templateId: input.templateId,
      status: result.status,
      providerReference,
      sentAt: this.clock.now().toISOString(),
    });
    return result;
  }

  /** Diagnostic only — tests and developer tooling, never product UI. */
  getLog(): MockCommunicationLogEntry[] {
    return [...this.log];
  }
}
