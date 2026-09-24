import { describe, expect, it } from "vitest";
import { PermissionDeniedError } from "../errors/DomainError";
import { assertPermission, hasPermission } from "./permissionGuard";
import { buildMemberPermission } from "../../../test/builders/entities";

describe("hasPermission / assertPermission", () => {
  it("is true when the flag is set and the permission is active", () => {
    const permission = buildMemberPermission("member-1", "coordinator");
    expect(hasPermission(permission, "canManageCircle")).toBe(true);
  });

  it("is false when the flag is unset", () => {
    const permission = buildMemberPermission("member-1", "family");
    expect(hasPermission(permission, "canManageCircle")).toBe(false);
  });

  it("is false once revoked, even if the flag is still true", () => {
    const permission = buildMemberPermission("member-1", "coordinator", {
      revokedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(hasPermission(permission, "canManageCircle")).toBe(false);
  });

  it("treats a missing permission record as no access", () => {
    expect(hasPermission(null, "canManageCircle")).toBe(false);
  });

  it("assertPermission throws PermissionDeniedError when denied", () => {
    expect(() => assertPermission(null, "canManageRoutines")).toThrow(PermissionDeniedError);
  });

  it("assertPermission does not throw when allowed", () => {
    const permission = buildMemberPermission("member-1", "coordinator");
    expect(() => assertPermission(permission, "canManageRoutines")).not.toThrow();
  });
});
