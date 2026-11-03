#!/usr/bin/env bash
# Builds the app and fails if anything server-only reached the browser bundle:
# the service-role key's name, the service-client factory, or the key's actual
# value from .env.local. See docs/superpowers/specs/2026-11-03-live-data-connection-design.md.
set -euo pipefail
cd "$(dirname "$0")/.."

bun run build >/dev/null

client_dir=""
for dir in .vercel/output/static .output/public; do
  if [ -d "$dir" ]; then client_dir="$dir"; break; fi
done
if [ -z "$client_dir" ]; then
  echo "check-client-bundle: no client output directory found after build" >&2
  exit 1
fi

patterns=("SUPABASE_SERVICE_ROLE_KEY" "createSupabaseServiceClient")
if [ -f .env.local ]; then
  key=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | head -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]\$//" || true)
  if [ -n "${key:-}" ]; then patterns+=("$key"); fi
fi

failed=0
for pattern in "${patterns[@]}"; do
  if matches=$(grep -rlF -- "$pattern" "$client_dir"); then
    label="$pattern"
    [ "${#pattern}" -gt 40 ] && label="the SUPABASE_SERVICE_ROLE_KEY value"
    echo "check-client-bundle: found $label in:" >&2
    echo "$matches" >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then exit 1; fi
echo "check-client-bundle: OK ($client_dir has no server-only secrets)"
