import { describe, expect, it } from "vitest";
import { sendAlertNotifications } from "./sendAlertNotifications";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import type { AlertRecipient, CommunicationEvent } from "../../domain/entities/alert";

function makeDeps() {
  const recipients = new Map<string, AlertRecipient>();
  const events: CommunicationEvent[] = [];
  const sent: string[] = [];
  return {
    alerts: {
      saveRecipient: async (r: AlertRecipient) => {
        recipients.set(r.id, r);
      },
    },
    communications: {
      findByIdempotencyKey: async (key: string) =>
        events.find((e) => e.idempotencyKey === key) ?? null,
      save: async (e: CommunicationEvent) => {
        events.push(e);
      },
    },
    notificationGateway: {
      send: async (input: { idempotencyKey: string }) => {
        sent.push(input.idempotencyKey);
        return { providerReference: "ref-1", status: "sent" as const };
      },
    },
    clock: new FakeClock(new Date("2026-01-05T09:10:00.000Z")),
    idGenerator: new SequentialIdGenerator("event"),
    _recipients: recipients,
    _events: events,
    _sent: sent,
  };
}

const recipient: AlertRecipient = {
  id: "recipient-1",
  alertId: "alert-1",
  circleMemberId: "member-1",
  channel: "push",
  stage: 1,
  deliveryStatus: "queued",
  providerReference: null,
  sentAt: null,
  deliveredAt: null,
  respondedAt: null,
  response: null,
};

describe("sendAlertNotifications", () => {
  it("sends once per recipient and records delivery status", async () => {
    const deps = makeDeps();
    await sendAlertNotifications(deps, {
      alertId: "alert-1",
      occurrenceId: "occ-1",
      recipients: [recipient],
      templateId: "welfare_check",
      templateData: { preferredName: "Margaret" },
    });
    expect(deps._sent).toHaveLength(1);
    expect(deps._recipients.get("recipient-1")?.deliveryStatus).toBe("sent");
    expect(deps._recipients.get("recipient-1")?.providerReference).toBe("ref-1");
  });

  it("is idempotent: a repeated call for the same alert/recipient/stage does not resend", async () => {
    const deps = makeDeps();
    await sendAlertNotifications(deps, {
      alertId: "alert-1",
      occurrenceId: "occ-1",
      recipients: [recipient],
      templateId: "welfare_check",
      templateData: {},
    });
    await sendAlertNotifications(deps, {
      alertId: "alert-1",
      occurrenceId: "occ-1",
      recipients: [recipient],
      templateId: "welfare_check",
      templateData: {},
    });
    expect(deps._sent).toHaveLength(1);
  });

  it("falls back to SMS when a voice send fails", async () => {
    const deps = makeDeps();
    deps.notificationGateway.send = (async (input: {
      channel: string;
      idempotencyKey: string;
    }) => ({
      providerReference: "ref-1",
      status: input.channel === "voice" ? ("failed" as const) : ("sent" as const),
    })) as typeof deps.notificationGateway.send;
    const voiceRecipient = { ...recipient, channel: "voice" as const };
    await sendAlertNotifications(deps, {
      alertId: "alert-1",
      occurrenceId: "occ-1",
      recipients: [voiceRecipient],
      templateId: "welfare_check",
      templateData: {},
    });
    expect(deps._events.some((e) => e.channel === "sms")).toBe(true);
    expect(deps._recipients.get("recipient-1")?.deliveryStatus).toBe("sent");
  });
});
