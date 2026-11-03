// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadContainer(dataAdapter: string) {
  vi.resetModules();
  vi.stubEnv("DATA_ADAPTER", dataAdapter);
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon");
  return (await import("./container")).container;
}

describe("container repositories", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses repository access in Supabase mode and points to server functions", async () => {
    const container = await loadContainer("supabase");
    expect(() => container.alertRepository).toThrow(/server functions/);
    expect(() => container.profileRepository).toThrow(/server functions/);
  });

  it("serves the localStorage repositories in local mode", async () => {
    const container = await loadContainer("local");
    expect(container.alertRepository).toBeDefined();
    expect(container.profileRepository).toBeDefined();
  });
});
