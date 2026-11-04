import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { buildUserProfile } from "../../../test/builders/entities";
import { saveProfileFor, saveProfileInput } from "./settingsApi";

describe("settings API", () => {
  it("only ever updates the verified user's own profile", async () => {
    const deps = buildInMemoryAppDeps();
    await deps.profileRepository.save(buildUserProfile({ id: "sarah", displayName: "Sarah" }));
    await deps.profileRepository.save(buildUserProfile({ id: "victim", displayName: "Victim" }));

    const parsed = saveProfileInput.parse({
      id: "victim",
      displayName: "Sarah S",
      preferredName: "Sarah",
    });
    expect(parsed).not.toHaveProperty("id");
    await saveProfileFor(deps, "sarah", parsed);

    expect((await deps.profileRepository.findById("sarah"))?.displayName).toBe("Sarah S");
    expect((await deps.profileRepository.findById("victim"))?.displayName).toBe("Victim");
  });
});
