import { describe, expect, it } from "vitest";
import { defaultPermissionsFor } from "../entities/careCircle";
import type { Routine } from "../entities/routine";
import { redactRoutineForViewer } from "./routineVisibility";

const baseRoutine: Routine = {
  id: "routine-1",
  careCircleId: "circle-1",
  olderAdultId: "margaret",
  type: "medication",
  title: "Morning check-in and tablets",
  description: "Blood pressure tablet with breakfast",
  timezone: "Europe/London",
  localTime: "09:00",
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  startDate: "2026-01-01",
  endDate: null,
  gracePeriodMinutes: 30,
  visibility: "family_and_nearby",
  enabled: true,
  notificationChannels: ["in_app"],
  createdBy: "sarah",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function fullPermission(kind: Parameters<typeof defaultPermissionsFor>[0]) {
  return {
    id: "perm-1",
    circleMemberId: "member-1",
    ...defaultPermissionsFor(kind),
    grantedAt: "2026-01-01T00:00:00.000Z",
    revokedAt: null,
  };
}

describe("redactRoutineForViewer", () => {
  it("hides the medication title and description from a nearby responder by default", () => {
    const view = redactRoutineForViewer(baseRoutine, fullPermission("nearby_responder"));
    expect(view.title).toBeNull();
    expect(view.description).toBeNull();
    // The welfare-check surface still comes through: what/when, not the label.
    expect(view.type).toBe("medication");
    expect(view.localTime).toBe("09:00");
  });

  it("shows the routine title and description to the coordinator", () => {
    const view = redactRoutineForViewer(baseRoutine, fullPermission("coordinator"));
    expect(view.title).toBe("Morning check-in and tablets");
    expect(view.description).toBe("Blood pressure tablet with breakfast");
  });

  it("hides a non-medication routine's title when canViewRoutineNames is revoked, even if labels are allowed", () => {
    const permission = {
      ...fullPermission("family"),
      canViewRoutineNames: false,
      canViewMedicationLabels: true,
    };
    const generalRoutine: Routine = { ...baseRoutine, type: "general_checkin" };
    const view = redactRoutineForViewer(generalRoutine, permission);
    expect(view.title).toBeNull();
  });

  it("a revoked permission (revokedAt set) is treated as no access to names or labels", () => {
    const permission = {
      ...fullPermission("family"),
      revokedAt: "2026-02-01T00:00:00.000Z",
    };
    const view = redactRoutineForViewer(baseRoutine, permission);
    expect(view.title).toBeNull();
    expect(view.description).toBeNull();
  });
});
