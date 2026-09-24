import type { AlertRepository, AuditRepository, OccurrenceRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { NotFoundError, PermissionDeniedError } from "../../domain/errors/DomainError";
import { transitionOccurrence } from "../../domain/state-machines/occurrenceStateMachine";
import { transitionAlert } from "../../domain/state-machines/alertStateMachine";
import type { ResolutionCode } from "../../domain/entities/alert";

export type ResolveAlertDeps = {
  alerts: AlertRepository;
  occurrences: OccurrenceRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * Resolution (Implementation.md §7.10, §9.3 "Resolving an alert stops
 * pending notification jobs"). Only the current claimant can resolve —
 * ownership is the whole point of claiming.
 */
export async function resolveAlert(
  deps: ResolveAlertDeps,
  input: {
    alertId: string;
    actorUserId: string;
    resolutionCode: ResolutionCode;
    resolutionNote: string | null;
  },
): Promise<void> {
  const alert = await deps.alerts.findById(input.alertId);
  if (!alert) throw new NotFoundError("Alert", input.alertId);
  if (alert.claimedBy !== input.actorUserId) {
    throw new PermissionDeniedError("resolve_own_claim");
  }

  const nowIso = deps.clock.now().toISOString();
  await deps.alerts.save({
    ...alert,
    status: transitionAlert(alert.status, "resolved"),
    resolvedAt: nowIso,
    resolvedBy: input.actorUserId,
    resolutionCode: input.resolutionCode,
    resolutionNote: input.resolutionNote,
    updatedAt: nowIso,
  });

  // Close the routine slot the alert was about. Otherwise a "missed" slot
  // stays unresolved forever — and keeps showing as her next routine.
  const occurrence = alert.occurrenceId
    ? await deps.occurrences.findById(alert.occurrenceId)
    : null;
  if (occurrence && (occurrence.status === "missed" || occurrence.status === "escalating")) {
    const escalating =
      occurrence.status === "missed"
        ? transitionOccurrence(occurrence.status, "escalating")
        : occurrence.status;
    await deps.occurrences.save({
      ...occurrence,
      status: transitionOccurrence(escalating, "resolved"),
      updatedAt: nowIso,
    });
  }

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: alert.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "alert.resolved",
    entityType: "Alert",
    entityId: alert.id,
    timestamp: nowIso,
    metadata: { resolutionCode: input.resolutionCode },
  });
}
