import type { AppDeps } from "@/application/ports/appDeps";
import type { CircleMember } from "@/domain/entities/careCircle";

/** Thrown when the verified user is not an active member of the circle they asked about. */
export class NotAMemberError extends Error {
  constructor() {
    super("not_a_member");
    this.name = "NotAMemberError";
  }
}

/**
 * The first check in every server function that names a circle: service-role
 * repositories bypass RLS, so this is what keeps one family's data from
 * another's.
 */
export async function requireActiveMember(
  deps: Pick<AppDeps, "careCircleRepository">,
  userId: string,
  circleId: string,
): Promise<CircleMember> {
  const member = await deps.careCircleRepository.findMemberByUserAndCircle(userId, circleId);
  if (!member || member.membershipStatus !== "active") throw new NotAMemberError();
  return member;
}
