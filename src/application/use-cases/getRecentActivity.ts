import type { AuditRepository } from "../ports/repositories";
import type { AuditEvent } from "../../domain/entities/consent";

export type GetRecentActivityDeps = { audit: AuditRepository };

export type ActivityItem = { id: string; timestamp: string; label: string };

/**
 * Plain-English activity timeline (Implementation.md §7.5, §7.9) built
 * directly from append-only audit events — no separate timeline table to
 * keep in sync.
 */
const LABELS: Record<string, string> = {
  "care_circle.created": "Circle was created",
  "invitation.sent": "An invitation was sent",
  "invitation.accepted": "An invitation was accepted",
  "circle_member.reordered": "Escalation order was changed",
  "member_permission.revoked": "Access was revoked",
  "consent.updated": "A privacy setting was changed",
  "routine.created": "A routine was added",
  "routine.acknowledged": "A routine was acknowledged",
};

export async function getRecentActivity(
  deps: GetRecentActivityDeps,
  input: { careCircleId: string; limit?: number },
): Promise<ActivityItem[]> {
  const events = await deps.audit.findByCareCircle(input.careCircleId);
  return events
    .slice()
    .sort((a: AuditEvent, b: AuditEvent) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, input.limit ?? 20)
    .map((e) => ({ id: e.id, timestamp: e.timestamp, label: LABELS[e.action] ?? e.action }));
}
