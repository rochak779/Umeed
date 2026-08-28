import { describe, expect, it, vi } from "vitest";
import { LocalEventBus } from "./LocalEventBus";

describe("LocalEventBus", () => {
  it("delivers a published event to a matching subscriber", () => {
    const bus = new LocalEventBus();
    const handler = vi.fn();
    bus.subscribe("alert_claimed", handler);

    bus.publish({ type: "alert_claimed", payload: { alertId: "a-1" }, occurredAt: "now" });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "alert_claimed",
      payload: { alertId: "a-1" },
      occurredAt: "now",
    });
  });

  it("does not deliver events to subscribers of a different type", () => {
    const bus = new LocalEventBus();
    const handler = vi.fn();
    bus.subscribe("alert_claimed", handler);

    bus.publish({ type: "routine_acknowledged", payload: {}, occurredAt: "now" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("stops delivering after unsubscribe", () => {
    const bus = new LocalEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe("alert_claimed", handler);
    unsubscribe();

    bus.publish({ type: "alert_claimed", payload: {}, occurredAt: "now" });

    expect(handler).not.toHaveBeenCalled();
  });
});
