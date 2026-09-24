#!/usr/bin/env bash
# Applies Umeed's pending migrations to the shared Supabase database.
# History lives in umeed._migrations, isolated from other apps' migrations.
# Never use `supabase db push` against the shared project — see
# docs/shared-supabase-db.md.
set -euo pipefail

cd "$(dirname "$0")/.."

APP="umeed"

# Read SUPABASE_DB_URL from the environment or .env.local. .env.local is
# parsed, not sourced, so values containing quotes or `$` don't break it.
if [ -z "${SUPABASE_DB_URL:-}" ] && [ -f .env.local ]; then
  SUPABASE_DB_URL="$(grep -E '^SUPABASE_DB_URL=' .env.local | tail -n 1 | cut -d= -f2-)"
fi
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set (see docs/shared-supabase-db.md)}"

PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q)

"${PSQL[@]}" -c "set client_min_messages to warning;
  create schema if not exists ${APP};
  create table if not exists ${APP}._migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  );
  -- The schema's default grants would otherwise expose migration history
  -- through the public API; RLS with no policies denies every API caller.
  alter table ${APP}._migrations enable row level security;
  revoke all on ${APP}._migrations from anon, authenticated;"

for file in supabase/migrations/*.sql; do
  version="$(basename "$file" .sql)"
  applied="$("${PSQL[@]}" -tAc "select 1 from ${APP}._migrations where version = '${version}'")"
  if [ -n "$applied" ]; then continue; fi

  echo "→ applying ${version}"
  # The file and its history row commit together, or not at all. `set local`
  # makes unqualified names land in the app schema, never in public.
  "${PSQL[@]}" --single-transaction \
    -c "set local search_path to ${APP}, extensions" \
    -f "$file" \
    -c "insert into ${APP}._migrations (version) values ('${version}')"
done

echo "✓ ${APP} is up to date"
