import type { AlertRepository, CareCircleRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";

export type ClaimAlertDeps = {
  alerts: AlertRepository;
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ClaimAlertResult =
  { ok: true } | { ok: false; reason: "already_claimed" | "not_claimable"; claimedByName?: string };

/**
 * "I'm handling this" (Implementation.md §7.5, §9.3). Delegates the actual
 * atomicity to AlertRepository.tryClaim — single-threaded JS locally,
 * a database compare-and-set once Supabase replaces this adapter. The loser
 * of a race gets a friendly message, never an error.
 */
export async function claimAlert(
  deps: ClaimAlertDeps,
  input: { alertId: string; claimerUserId: string; claimWindowMinutes: number },
): Promise<ClaimAlertResult> {
  const nowIso = deps.clock.now().toISOString();
  const claimExpiresAt = new Date(
    deps.clock.now().getTime() + input.claimWindowMinutes * 60_000,
  ).toISOString();

  const won = await deps.alerts.tryClaim(
    input.alertId,
    input.claimerUserId,
    nowIso,
    claimExpiresAt,
  );
  if (!won) {
    const current = await deps.alerts.findById(input.alertId);
    if (!current || current.status === "claimed") {
      return { ok: false, reason: "already_claimed" };
    }
    return { ok: false, reason: "not_claimable" };
  }

  const alert = await deps.alerts.findById(input.alertId);
  if (alert) {
    await deps.audit.append({
      id: deps.idGenerator.nextId(),
      careCircleId: alert.careCircleId,
      actorId: input.claimerUserId,
      actorType: "user",
      action: "alert.claimed",
      entityType: "Alert",
      entityId: alert.id,
      timestamp: nowIso,
      metadata: {},
    });
  }

  return { ok: true };
}
