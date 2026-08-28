import { describe, expect, it } from "vitest";
import { resolveActiveMembership } from "./SessionContext";

describe("resolveActiveMembership", () => {
  const membershipA = { circle: { id: "circle-a" } } as never;
  const membershipB = { circle: { id: "circle-b" } } as never;

  it("returns the membership matching activeCircleId", () => {
    expect(resolveActiveMembership([membershipA, membershipB], "circle-b")).toBe(membershipB);
  });

  it("falls back to the first membership when activeCircleId is null or not found", () => {
    expect(resolveActiveMembership([membershipA, membershipB], null)).toBe(membershipA);
    expect(resolveActiveMembership([membershipA, membershipB], "circle-z")).toBe(membershipA);
  });
});
