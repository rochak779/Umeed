import { describe, expect, it } from "vitest";
import { InMemoryKeyValueStore } from "../KeyValueStore";
import { LocalConsentRepository } from "./LocalConsentRepository";
import type { ConsentRecord } from "../../../domain/entities/consent";

function makeConsent(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    id: "consent-1",
    careCircleId: "circle-1",
    subjectUserId: "margaret",
    consentType: "circle_participation",
    policyVersion: "1.0",
    status: "granted",
    grantedAt: "2026-01-01T00:00:00.000Z",
    revokedAt: null,
    recordedBy: "margaret",
    ...overrides,
  };
}

describe("LocalConsentRepository", () => {
  it("lists consent records for a care circle", async () => {
    const repo = new LocalConsentRepository(new InMemoryKeyValueStore());
    await repo.save(makeConsent());
    expect(await repo.findByCareCircle("circle-1")).toHaveLength(1);
  });

  it("recording a revocation as a new status update is reflected on read", async () => {
    const repo = new LocalConsentRepository(new InMemoryKeyValueStore());
    await repo.save(makeConsent());
    await repo.save(
      makeConsent({ status: "revoked", revokedAt: "2026-02-01T00:00:00.000Z", grantedAt: null }),
    );
    const records = await repo.findByCareCircle("circle-1");
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("revoked");
  });
});
