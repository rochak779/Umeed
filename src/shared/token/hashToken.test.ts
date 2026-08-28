import { describe, expect, it } from "vitest";
import { hashToken } from "./hashToken";

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("never returns the original plaintext", () => {
    expect(hashToken("my-secret-token")).not.toContain("my-secret-token");
  });
});
