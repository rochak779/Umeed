import { describe, expect, it } from "vitest";
import { buildInMemoryAppDeps } from "../../../test/builders/appDeps";
import { buildUserProfile } from "../../../test/builders/entities";
import { startFor } from "@/features/circle/circleApi";
import { acceptFor } from "@/features/invitations/invitationApi";
import { NotAMemberError } from "@/server/membership";
import { acknowledgeFor, createFor, listFor, raiseHelpFor } from "./routineApi";

const routine = {
  type: "medication" as const,
  title: "Morning tablets",
  description: null,
  timezone: "Europe/London",
  localTime: "09:00",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  startDate: "2026-01-05",
  endDate: null,
  gracePeriodMinutes: 30,
};

async function circleWithMargaret() {
  const deps = buildInMemoryAppDeps();
  await deps.profileRepository.save(buildUserProfile({ id: "sarah", displayName: "Sarah" }));
  const { circle, plaintextToken } = await startFor(deps, "sarah", {
    olderAdultPreferredName: "Margaret",
    invitedEmail: "margaret@example.test",
    invitedPhone: null,
  });
  await acceptFor(
    deps,
    { userId: "margaret", email: "margaret@example.test" },
    { token: plaintextToken },
  );
  return { deps, circleId: circle.id };
}

describe("routine API", () => {
  it("refuses the routine list to someone outside the circle", async () => {
    const { deps, circleId } = await circleWithMargaret();
    await expect(listFor(deps, "outsider", { circleId })).rejects.toBeInstanceOf(NotAMemberError);
  });

  it("refuses routine creation to someone outside the circle", async () => {
    const { deps, circleId } = await circleWithMargaret();
    await expect(createFor(deps, "outsider", { circleId, ...routine })).rejects.toBeInstanceOf(
      NotAMemberError,
    );
  });

  it("lists a member's routines with their manage permission", async () => {
    const { deps, circleId } = await circleWithMargaret();
    const result = await listFor(deps, "sarah", { circleId });
    expect(result).toEqual({ routines: [], canManageRoutines: true });
  });

  it("refuses to acknowledge an occurrence in a circle the actor is not in", async () => {
    const { deps, circleId } = await circleWithMargaret();
    const created = await createFor(deps, "sarah", { circleId, ...routine });
    const [occurrence] = await deps.occurrenceRepository.findByRoutine(created.id);
    if (!occurrence) throw new Error("expected an occurrence");
    await expect(
      acknowledgeFor(deps, "outsider", { occurrenceId: occurrence.id }),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });

  it("records a help alert as raised by the verified older adult", async () => {
    const { deps, circleId } = await circleWithMargaret();
    const { alertId } = await raiseHelpFor(deps, "margaret", {});
    const alert = await deps.alertRepository.findById(alertId);
    expect(alert?.careCircleId).toBe(circleId);
  });
});
