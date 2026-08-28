import { describe, expect, it } from "vitest";
import { InvalidTransitionError } from "../errors/DomainError";
import { canTransitionAlert, transitionAlert } from "./alertStateMachine";

describe("alert state machine", () => {
  it("allows open -> notifying -> unclaimed -> claimed -> resolved", () => {
    expect(transitionAlert("open", "notifying")).toBe("notifying");
    expect(transitionAlert("notifying", "unclaimed")).toBe("unclaimed");
    expect(transitionAlert("unclaimed", "claimed")).toBe("claimed");
    expect(transitionAlert("claimed", "resolved")).toBe("resolved");
  });

  it("allows notifying -> claimed directly (first responder claims immediately)", () => {
    expect(transitionAlert("notifying", "claimed")).toBe("claimed");
  });

  it("allows claimed -> unclaimed when a claim expires", () => {
    expect(transitionAlert("claimed", "unclaimed")).toBe("unclaimed");
  });

  it("allows unclaimed -> unresolved when escalation is exhausted", () => {
    expect(transitionAlert("unclaimed", "unresolved")).toBe("unresolved");
  });

  it("allows open/notifying/unclaimed -> cancelled", () => {
    for (const state of ["open", "notifying", "unclaimed"] as const) {
      expect(transitionAlert(state, "cancelled")).toBe("cancelled");
    }
  });

  it("rejects cancelling once claimed", () => {
    expect(canTransitionAlert("claimed", "cancelled")).toBe(false);
    expect(() => transitionAlert("claimed", "cancelled")).toThrow(InvalidTransitionError);
  });

  it("rejects transitions out of resolved/unresolved/cancelled", () => {
    for (const finalState of ["resolved", "unresolved", "cancelled"] as const) {
      expect(canTransitionAlert(finalState, "open")).toBe(false);
    }
  });

  it("rejects resolving an alert that was never claimed", () => {
    expect(canTransitionAlert("unclaimed", "resolved")).toBe(false);
  });
});
