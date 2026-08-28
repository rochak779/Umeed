import { PermissionDeniedError } from "../errors/DomainError";
import type { MemberPermission } from "../entities/careCircle";

type PermissionFlag = keyof Omit<
  MemberPermission,
  "id" | "circleMemberId" | "grantedAt" | "revokedAt"
>;

/**
 * Application-level permission check (Implementation.md §13.3: "Do not rely
 * only on hidden UI elements"). A missing or revoked permission record means
 * no access, regardless of what the flag says.
 */
export function hasPermission(permission: MemberPermission | null, flag: PermissionFlag): boolean {
  if (!permission) return false;
  if (permission.revokedAt !== null) return false;
  return permission[flag];
}

export function assertPermission(permission: MemberPermission | null, flag: PermissionFlag): void {
  if (!hasPermission(permission, flag)) {
    throw new PermissionDeniedError(flag);
  }
}
