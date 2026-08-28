import { describe, expect, it } from "vitest";
import {
  buildMargaretScenarioRepositories,
  seedMargaretScenario,
} from "../../../test/fixtures/margaretScenario";
import { SequentialIdGenerator } from "../../shared/id/IdGenerator";
import { FakeClock } from "../../shared/time/Clock";
import { PermissionDeniedError } from "../../domain/errors/DomainError";
import { setConsent } from "./setConsent";

function makeDeps(repos: ReturnType<typeof buildMargaretScenarioRepositories>) {
  return {
    careCircles: repos.careCircles,
    consents: repos.consents,
    audit: repos.audit,
    clock: new FakeClock(new Date("2026-01-01T00:00:00.000Z")),
    idGenerator: new SequentialIdGenerator("id"),
  };
}

describe("setConsent", () => {
  it("lets the older adult grant sharing her address with the nearby responder", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await setConsent(deps, {
      careCircleId: circle.id,
      actorUserId: "margaret",
      consentType: "share_address_with_nearby_responder",
      status: "granted",
    });

    const records = await repos.consents.findByCareCircle(circle.id);
    const record = records.find((r) => r.consentType === "share_address_with_nearby_responder");
    expect(record?.status).toBe("granted");
  });

  it("lets the older adult later revoke that consent, and it is audited", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await setConsent(deps, {
      careCircleId: circle.id,
      actorUserId: "margaret",
      consentType: "automated_calls_enabled",
      status: "granted",
    });
    await setConsent(deps, {
      careCircleId: circle.id,
      actorUserId: "margaret",
      consentType: "automated_calls_enabled",
      status: "revoked",
    });

    const records = await repos.consents.findByCareCircle(circle.id);
    const record = records.find((r) => r.consentType === "automated_calls_enabled");
    expect(record?.status).toBe("revoked");
    const events = await repos.audit.findByCareCircle(circle.id);
    expect(events.filter((e) => e.action === "consent.updated")).toHaveLength(2);
  });

  it("rejects the coordinator trying to set the older adult's consent", async () => {
    const repos = buildMargaretScenarioRepositories();
    const { circle } = await seedMargaretScenario(repos);
    const deps = makeDeps(repos);

    await expect(
      setConsent(deps, {
        careCircleId: circle.id,
        actorUserId: "sarah",
        consentType: "automated_calls_enabled",
        status: "granted",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
