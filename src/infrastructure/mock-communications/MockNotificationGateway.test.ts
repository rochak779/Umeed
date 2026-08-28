import { describe, expect, it } from "vitest";
import { MockNotificationGateway } from "./MockNotificationGateway";
import { FakeClock } from "../../shared/time/Clock";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";

describe("MockNotificationGateway", () => {
  it("returns a queued/sent result with a provider-style reference id", async () => {
    const gateway = new MockNotificationGateway(
      new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      new SequentialIdGenerator("mock-ref"),
    );
    const result = await gateway.send({
      channel: "in_app",
      recipientId: "member-1",
      idempotencyKey: "key-1",
      templateId: "routine_reminder",
      templateData: { preferredName: "Margaret" },
    });
    expect(result.status).toBe("sent");
    expect(result.providerReference).toBe("mock-ref-1");
  });

  it("simulates a configurable failure for voice channel", async () => {
    const gateway = new MockNotificationGateway(
      new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      new SequentialIdGenerator("mock-ref"),
      { voice: { failureRate: 1 } },
    );
    const result = await gateway.send({
      channel: "voice",
      recipientId: "older-adult-1",
      idempotencyKey: "key-2",
      templateId: "routine_reminder_call",
      templateData: {},
    });
    expect(result.status).toBe("failed");
  });

  it("logs every send for diagnostics only", async () => {
    const gateway = new MockNotificationGateway(
      new FakeClock(new Date("2026-01-05T09:00:00.000Z")),
      new SequentialIdGenerator("mock-ref"),
    );
    await gateway.send({
      channel: "sms",
      recipientId: "member-2",
      idempotencyKey: "key-3",
      templateId: "welfare_check_sms",
      templateData: {},
    });
    expect(gateway.getLog()).toHaveLength(1);
    expect(gateway.getLog()[0]?.channel).toBe("sms");
  });
});
