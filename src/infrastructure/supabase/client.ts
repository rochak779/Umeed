import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_DB_SCHEMA } from "./schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Supabase adapters cannot start without it.`,
    );
  }
  return value;
}

export function createSupabaseServiceClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    db: { schema: SUPABASE_DB_SCHEMA },
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as SupabaseClient;
}

export function createSupabaseAnonClient(accessToken?: string): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    db: { schema: SUPABASE_DB_SCHEMA },
    auth: { autoRefreshToken: false, persistSession: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  }) as unknown as SupabaseClient;
}
