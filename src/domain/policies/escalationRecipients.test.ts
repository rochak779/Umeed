import { describe, expect, it } from "vitest";
import { selectNextRecipients } from "./escalationRecipients";
import { buildCircleMember } from "../../../test/builders/entities";
import type { EscalationStep } from "../entities/routine";

const step: EscalationStep = {
  order: 3,
  delayMinutes: 10,
  recipientType: "nearby_responder",
  recipientId: null,
  channel: "push",
  responseWindowMinutes: 5,
  fallbackBehaviour: "advance_to_next_step",
};

describe("selectNextRecipients", () => {
  it("filters to members matching the step's recipient type", () => {
    const members = [
      buildCircleMember({ id: "m-1", responderType: "family", isNearby: false }),
      buildCircleMember({ id: "m-2", responderType: "nearby_responder", isNearby: true }),
    ];
    const result = selectNextRecipients(members, step, "2026-01-05T09:20:00.000Z", "Europe/London");
    expect(result.map((m) => m.id)).toEqual(["m-2"]);
  });

  it("orders candidates by ascending priority", () => {
    const members = [
      buildCircleMember({
        id: "low-priority",
        responderType: "nearby_responder",
        isNearby: true,
        priority: 5,
      }),
      buildCircleMember({
        id: "high-priority",
        responderType: "nearby_responder",
        isNearby: true,
        priority: 0,
      }),
    ];
    const result = selectNextRecipients(members, step, "2026-01-05T09:20:00.000Z", "Europe/London");
    expect(result.map((m) => m.id)).toEqual(["high-priority", "low-priority"]);
  });

  it("excludes a member outside their declared availability window", () => {
    const members = [
      buildCircleMember({
        id: "unavailable",
        responderType: "nearby_responder",
        isNearby: true,
        availability: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startLocalTime: "09:00",
          endLocalTime: "17:00",
        },
      }),
    ];
    // 2026-01-05 09:20 UTC on a Monday is within the window in winter (GMT = UTC+0)... use a Sunday instead.
    const sundayMorning = "2026-01-04T09:20:00.000Z"; // Sunday, not in [1..5]
    const result = selectNextRecipients(members, step, sundayMorning, "Europe/London");
    expect(result).toHaveLength(0);
  });

  it("includes a member with no declared availability (always available)", () => {
    const members = [
      buildCircleMember({
        id: "always",
        responderType: "nearby_responder",
        isNearby: true,
        availability: null,
      }),
    ];
    const result = selectNextRecipients(members, step, "2026-01-04T09:20:00.000Z", "Europe/London");
    expect(result.map((m) => m.id)).toEqual(["always"]);
  });

  it("returns an empty list when nobody matches", () => {
    const result = selectNextRecipients([], step, "2026-01-05T09:20:00.000Z", "Europe/London");
    expect(result).toEqual([]);
  });
});
