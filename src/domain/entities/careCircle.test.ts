import { describe, expect, it } from "vitest";
import { defaultPermissionsFor } from "./careCircle";

describe("defaultPermissionsFor", () => {
  it("does not let a nearby responder see medication labels, notes, routine names or address by default", () => {
    const perms = defaultPermissionsFor("nearby_responder");
    expect(perms.canViewMedicationLabels).toBe(false);
    expect(perms.canViewNotes).toBe(false);
    expect(perms.canViewRoutineNames).toBe(false);
    expect(perms.canViewAddress).toBe(false);
    // Still gets the minimal welfare-check surface.
    expect(perms.canViewRoutineStatus).toBe(true);
    expect(perms.canReceiveAlerts).toBe(true);
  });

  it("gives the coordinator full management rights", () => {
    const perms = defaultPermissionsFor("coordinator");
    expect(perms.canManageCircle).toBe(true);
    expect(perms.canManageRoutines).toBe(true);
    expect(perms.canViewMedicationLabels).toBe(true);
  });

  it("does not let a family member manage the circle or routines by default", () => {
    const perms = defaultPermissionsFor("family");
    expect(perms.canManageCircle).toBe(false);
    expect(perms.canManageRoutines).toBe(false);
  });
});
