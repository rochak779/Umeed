import { describe, expect, it } from "vitest";
import { getEscalationStepForStage } from "./escalationStageLookup";
import { buildEscalationPolicy } from "../../../test/builders/entities";

describe("getEscalationStepForStage", () => {
  it("returns the first non-older-adult step for stage 1", () => {
    const policy = buildEscalationPolicy();
    const step = getEscalationStepForStage(policy, 1);
    expect(step?.recipientType).toBe("nearby_responder");
  });

  it("returns the second non-older-adult step for stage 2", () => {
    const policy = buildEscalationPolicy();
    const step = getEscalationStepForStage(policy, 2);
    expect(step?.recipientType).toBe("coordinator");
  });

  it("returns null once the sequence is exhausted", () => {
    const policy = buildEscalationPolicy();
    expect(getEscalationStepForStage(policy, 3)).toBeNull();
  });
});
