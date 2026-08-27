import { InvalidTransitionError } from "../errors/DomainError";
import type { OccurrenceStatus } from "../entities/routine";

/**
 * Allowed occurrence transitions (Implementation.md §9.1). Invalid
 * transitions are rejected here, not merely hidden in the UI.
 */
const ALLOWED_TRANSITIONS: Record<OccurrenceStatus, ReadonlyArray<OccurrenceStatus>> = {
  scheduled: ["awaiting_response", "cancelled"],
  awaiting_response: ["acknowledged", "missed", "cancelled"],
  acknowledged: [],
  missed: ["acknowledged", "escalating", "cancelled"],
  escalating: ["acknowledged", "resolved", "cancelled"],
  resolved: [],
  cancelled: [],
};

export function canTransitionOccurrence(from: OccurrenceStatus, to: OccurrenceStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionOccurrence(
  from: OccurrenceStatus,
  to: OccurrenceStatus,
): OccurrenceStatus {
  if (!canTransitionOccurrence(from, to)) {
    throw new InvalidTransitionError("RoutineOccurrence", from, to);
  }
  return to;
}
