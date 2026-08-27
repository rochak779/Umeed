import { InvalidTransitionError } from "../errors/DomainError";
import type { AlertStatus } from "../entities/alert";

/** Allowed alert transitions (Implementation.md §9.2). */
const ALLOWED_TRANSITIONS: Record<AlertStatus, ReadonlyArray<AlertStatus>> = {
  open: ["notifying", "cancelled"],
  notifying: ["unclaimed", "claimed", "cancelled"],
  unclaimed: ["claimed", "unresolved", "cancelled"],
  claimed: ["unclaimed", "resolved"],
  resolved: [],
  unresolved: [],
  cancelled: [],
};

export function canTransitionAlert(from: AlertStatus, to: AlertStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionAlert(from: AlertStatus, to: AlertStatus): AlertStatus {
  if (!canTransitionAlert(from, to)) {
    throw new InvalidTransitionError("Alert", from, to);
  }
  return to;
}
