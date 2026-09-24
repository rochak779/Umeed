import type { CareCircleRepository, AuditRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { NotFoundError, PermissionDeniedError } from "../../domain/errors/DomainError";

export type RequestLeaveCircleDeps = {
  careCircles: CareCircleRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

/**
 * A family member or nearby responder leaving a circle they no longer wish
 * to participate in (Implementation.md §16 Phase 7 "leave-circle request
 * flows"). Coordinators and the older adult cannot leave via this path —
 * removing either would leave the circle without its anchor member. The UI
 * directs them to a future "close circle" action instead (out of scope
 * here).
 */
export async function requestLeaveCircle(
  deps: RequestLeaveCircleDeps,
  input: { careCircleId: string; userId: string },
): Promise<{ ok: true }> {
  const member = await deps.careCircles.findMemberByUserAndCircle(input.userId, input.careCircleId);
  if (!member) throw new NotFoundError("CircleMember", `${input.userId}:${input.careCircleId}`);
  if (member.responderType === "coordinator" || member.responderType === "older_adult") {
    throw new PermissionDeniedError("coordinator_and_older_adult_cannot_leave");
  }

  const nowIso = deps.clock.now().toISOString();
  await deps.careCircles.saveMember({ ...member, membershipStatus: "removed", updatedAt: nowIso });

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.userId,
    actorType: "user",
    action: "member.left",
    entityType: "CircleMember",
    entityId: member.id,
    timestamp: nowIso,
    metadata: {},
  });

  return { ok: true };
}
