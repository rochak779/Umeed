import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";

describe("createSupabaseServiceClient", () => {
  const originalUrl = process.env["SUPABASE_URL"];
  const originalKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  afterEach(() => {
    process.env["SUPABASE_URL"] = originalUrl;
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = originalKey;
  });

  it("throws a clear error when SUPABASE_URL is missing", () => {
    delete process.env["SUPABASE_URL"];
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-key";
    expect(() => createSupabaseServiceClient()).toThrow(/SUPABASE_URL/);
  });

  it("builds a client when both env vars are present", () => {
    process.env["SUPABASE_URL"] = "https://example.supabase.co";
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-key";
    expect(() => createSupabaseServiceClient()).not.toThrow();
  });
});
