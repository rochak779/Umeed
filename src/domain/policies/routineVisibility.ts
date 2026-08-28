import type { MemberPermission } from "../entities/careCircle";
import type { Routine } from "../entities/routine";

export type RedactedRoutineView = {
  id: string;
  type: Routine["type"];
  localTime: string;
  enabled: boolean;
  title: string | null;
  description: string | null;
};

function isActive(permission: MemberPermission): boolean {
  return permission.revokedAt === null;
}

/**
 * Redacts a Routine for a given viewer's permissions (Implementation.md §4.4,
 * §13.3). Minimum necessary disclosure: a nearby responder gets the
 * welfare-check surface (type, time, whether it's enabled) but never the
 * medication label or free-text description unless explicitly granted.
 */
export function redactRoutineForViewer(
  routine: Routine,
  permission: MemberPermission,
): RedactedRoutineView {
  const active = isActive(permission);
  const canSeeLabel =
    active &&
    (routine.type === "medication"
      ? permission.canViewMedicationLabels
      : permission.canViewRoutineNames);

  return {
    id: routine.id,
    type: routine.type,
    localTime: routine.localTime,
    enabled: routine.enabled,
    title: canSeeLabel ? routine.title : null,
    description: canSeeLabel ? routine.description : null,
  };
}
