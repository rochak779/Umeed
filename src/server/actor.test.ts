import { describe, expect, it } from "vitest";
import { resolveActor, UnauthenticatedError } from "./actor";

describe("resolveActor", () => {
  it("returns the verified user's id and email", async () => {
    const actor = await resolveActor(async () => ({ id: "user-1", email: "a@example.test" }));
    expect(actor).toEqual({ userId: "user-1", email: "a@example.test" });
  });

  it("throws UnauthenticatedError when there is no signed-in user", async () => {
    await expect(resolveActor(async () => null)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
