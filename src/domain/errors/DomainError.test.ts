import { describe, expect, it } from "vitest";
import {
  ConflictError,
  InvalidTransitionError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "./DomainError";

describe("domain errors", () => {
  it("carry a stable machine-readable code and are real Errors", () => {
    const cases = [
      new ValidationError("bad input"),
      new NotFoundError("Routine", "r-1"),
      new PermissionDeniedError("canViewMedicationLabels"),
      new InvalidTransitionError("Alert", "resolved", "open"),
      new ConflictError("alert already claimed"),
    ];
    for (const err of cases) {
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBeTruthy();
    }
  });

  it("NotFoundError names the entity and id in its message", () => {
    const err = new NotFoundError("Routine", "r-1");
    expect(err.message).toContain("Routine");
    expect(err.message).toContain("r-1");
  });

  it("InvalidTransitionError names the entity and both states", () => {
    const err = new InvalidTransitionError("Alert", "resolved", "open");
    expect(err.message).toContain("resolved");
    expect(err.message).toContain("open");
  });
});
