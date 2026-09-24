-- Umeed lives in its own schema inside the shared "Rochak's Hobby" Supabase
-- project (docs/shared-supabase-db.md). scripts/db-migrate.sh runs every
-- migration with search_path = umeed, extensions, so unqualified names in
-- the files after this one land here, never in public.
create schema if not exists umeed;
comment on schema umeed is 'Umeed (family elder-care) — github.com/rochak779/Umeed';

grant usage on schema umeed to anon, authenticated, service_role;

grant all on all tables    in schema umeed to anon, authenticated, service_role;
grant all on all routines  in schema umeed to anon, authenticated, service_role;
grant all on all sequences in schema umeed to anon, authenticated, service_role;

alter default privileges for role postgres in schema umeed
  grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema umeed
  grant all on routines  to anon, authenticated, service_role;
alter default privileges for role postgres in schema umeed
  grant all on sequences to anon, authenticated, service_role;
