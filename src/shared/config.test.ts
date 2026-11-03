import { describe, expect, it } from "vitest";
import { isSupabaseMode, publicSupabaseConfig } from "./config";

describe("isSupabaseMode", () => {
  it("is true when the server's DATA_ADAPTER is supabase", () => {
    expect(isSupabaseMode({ processEnv: { DATA_ADAPTER: "supabase" } })).toBe(true);
  });

  it("is false when DATA_ADAPTER is unset or local", () => {
    expect(isSupabaseMode({ processEnv: {} })).toBe(false);
    expect(isSupabaseMode({ processEnv: { DATA_ADAPTER: "local" } })).toBe(false);
  });

  it("reads VITE_DATA_ADAPTER in the browser, where there is no process.env", () => {
    expect(isSupabaseMode({ viteEnv: { VITE_DATA_ADAPTER: "supabase" } })).toBe(true);
    expect(isSupabaseMode({ viteEnv: {} })).toBe(false);
  });

  it("falls back to VITE_DATA_ADAPTER on the server so one variable can drive both", () => {
    expect(isSupabaseMode({ processEnv: { VITE_DATA_ADAPTER: "supabase" } })).toBe(true);
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
