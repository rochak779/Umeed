/**
 * Typed domain errors (Implementation.md §11). Use cases throw these instead
 * of generic Errors so callers (route guards, use cases, tests) can branch on
 * `.code` rather than parsing messages.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class ValidationError extends DomainError {
  readonly code = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found";
  constructor(entityType: string, entityId: string) {
    super(`${entityType} ${entityId} was not found`);
    this.name = "NotFoundError";
  }
}

/** Thrown when a user's permissions do not allow the attempted action. */
export class PermissionDeniedError extends DomainError {
  readonly code = "permission_denied";
  constructor(permission: string) {
    super(`Missing required permission: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

/** Thrown when a state machine is asked to make a transition it does not allow. */
export class InvalidTransitionError extends DomainError {
  readonly code = "invalid_transition";
  constructor(entityType: string, from: string, to: string) {
    super(`${entityType} cannot transition from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
  }
}

/** Thrown on optimistic-concurrency or uniqueness conflicts (e.g. a claim race). */
export class ConflictError extends DomainError {
  readonly code = "conflict";
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
