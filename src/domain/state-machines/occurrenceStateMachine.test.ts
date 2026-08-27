import { describe, expect, it } from "vitest";
import { InvalidTransitionError } from "../errors/DomainError";
import { canTransitionOccurrence, transitionOccurrence } from "./occurrenceStateMachine";

describe("occurrence state machine", () => {
  it("allows scheduled -> awaiting_response", () => {
    expect(transitionOccurrence("scheduled", "awaiting_response")).toBe("awaiting_response");
  });

  it("allows awaiting_response -> acknowledged", () => {
    expect(transitionOccurrence("awaiting_response", "acknowledged")).toBe("acknowledged");
  });

  it("allows awaiting_response -> missed", () => {
    expect(transitionOccurrence("awaiting_response", "missed")).toBe("missed");
  });

  it("allows late acknowledgement: missed -> acknowledged", () => {
    expect(transitionOccurrence("missed", "acknowledged")).toBe("acknowledged");
  });

  it("allows missed -> escalating", () => {
    expect(transitionOccurrence("missed", "escalating")).toBe("escalating");
  });

  it("allows escalating -> acknowledged and escalating -> resolved", () => {
    expect(transitionOccurrence("escalating", "acknowledged")).toBe("acknowledged");
    expect(transitionOccurrence("escalating", "resolved")).toBe("resolved");
  });

  it("allows any non-final state to cancel", () => {
    for (const state of ["scheduled", "awaiting_response", "missed", "escalating"] as const) {
      expect(transitionOccurrence(state, "cancelled")).toBe("cancelled");
    }
  });

  it("rejects acknowledged -> missed", () => {
    expect(canTransitionOccurrence("acknowledged", "missed")).toBe(false);
    expect(() => transitionOccurrence("acknowledged", "missed")).toThrow(InvalidTransitionError);
  });

  it("rejects transitions out of final states", () => {
    for (const finalState of ["resolved", "cancelled"] as const) {
      expect(canTransitionOccurrence(finalState, "scheduled")).toBe(false);
    }
  });

  it("rejects skipping straight from scheduled to acknowledged", () => {
    expect(canTransitionOccurrence("scheduled", "acknowledged")).toBe(false);
  });
});
