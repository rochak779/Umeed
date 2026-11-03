import { describe, expect, it } from "vitest";
import { isSupabaseMode, publicSupabaseConfig } from "./config";

describe("isSupabaseMode", () => {
  it("is true when the build-time VITE_DATA_ADAPTER is supabase", () => {
    expect(isSupabaseMode({ viteEnv: { VITE_DATA_ADAPTER: "supabase" } })).toBe(true);
  });

  it("is false when VITE_DATA_ADAPTER is unset or local", () => {
    expect(isSupabaseMode({ viteEnv: {} })).toBe(false);
    expect(isSupabaseMode({ viteEnv: { VITE_DATA_ADAPTER: "local" } })).toBe(false);
  });

  it("ignores a runtime-only VITE_DATA_ADAPTER the browser build never saw", () => {
    expect(isSupabaseMode({ processEnv: { VITE_DATA_ADAPTER: "supabase" }, viteEnv: {} })).toBe(
      false,
    );
  });

  it("fails loudly when the server's DATA_ADAPTER disagrees with the build", () => {
    expect(() => isSupabaseMode({ processEnv: { DATA_ADAPTER: "supabase" }, viteEnv: {} })).toThrow(
      /VITE_DATA_ADAPTER/,
    );
  });

  it("accepts a matching or local DATA_ADAPTER alongside the build value", () => {
    expect(
      isSupabaseMode({
        processEnv: { DATA_ADAPTER: "supabase" },
        viteEnv: { VITE_DATA_ADAPTER: "supabase" },
      }),
    ).toBe(true);
    expect(isSupabaseMode({ processEnv: { DATA_ADAPTER: "local" }, viteEnv: {} })).toBe(false);
  });
});

describe("publicSupabaseConfig", () => {
  it("returns the server's URL and anon key", () => {
    expect(
      publicSupabaseConfig({
        processEnv: { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" },
      }),
    ).toEqual({ url: "https://x.supabase.co", anonKey: "anon" });
  });

  it("returns the VITE_ values in the browser", () => {
    expect(
      publicSupabaseConfig({
        viteEnv: { VITE_SUPABASE_URL: "https://y.supabase.co", VITE_SUPABASE_ANON_KEY: "anon2" },
      }),
    ).toEqual({ url: "https://y.supabase.co", anonKey: "anon2" });
  });

  it("names the missing variable", () => {
    expect(() => publicSupabaseConfig({ processEnv: { SUPABASE_ANON_KEY: "anon" } })).toThrow(
      /SUPABASE_URL/,
    );
  });
});
