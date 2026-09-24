// Umeed's tables live in their own Postgres schema inside a Supabase project
// shared with other apps (see docs/shared-supabase-db.md). Every Supabase
// client must target it, or reads and writes silently hit `public` instead.
export const SUPABASE_DB_SCHEMA = "umeed";
//
// Clients built with this schema are typed SupabaseClient<any, "umeed">,
// which TypeScript won't assign to the plain `SupabaseClient` (defaulting to
// "public") used across the repositories. With no generated Database type the
// schema generic carries no column typing, so construction sites cast back to
// `SupabaseClient` rather than threading the generic through every file.
