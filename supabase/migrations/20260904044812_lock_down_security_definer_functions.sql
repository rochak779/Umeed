-- Lock down the security-definer functions introduced in earlier Phase 9
-- migrations. Two problems fixed here:
--
-- 1. `claim_alert` is `security definer` with no authorization check.
--    Postgres grants EXECUTE to PUBLIC by default on newly created
--    functions, so any holder of the anon/authenticated key could call it
--    directly and forge a claim on any alert, bypassing RLS entirely. The
--    application only ever calls this function through the service-role
--    client (see SupabaseAlertRepository.tryClaim), which is unaffected by
--    a `revoke` — the service_role bypasses grants/RLS altogether. Revoking
--    execute from public/anon/authenticated closes the anon-key bypass
--    without touching the app's own call path.
--
-- 2. None of the three security-definer/plpgsql functions pinned
--    `search_path`, which is the class of vulnerability Supabase's linter
--    flags on SECURITY DEFINER functions: a caller able to influence the
--    session's search_path could shadow an unqualified identifier with a
--    same-named object in another schema. Pinning `search_path = umeed,
--    extensions, pg_temp` on each closes that off. (`set_updated_at()` isn't itself
--    security definer, but it is trigger-attached to every RLS-protected
--    table, so it gets the same pin for defense in depth.)

revoke execute on function claim_alert(text, text, timestamptz, timestamptz)
  from public, anon, authenticated;

alter function set_updated_at() set search_path = umeed, extensions, pg_temp;
alter function is_active_circle_member(text) set search_path = umeed, extensions, pg_temp;
alter function claim_alert(text, text, timestamptz, timestamptz) set search_path = umeed, extensions, pg_temp;

-- Documentation-only fix (Important 5 from the Phase 9 final review): the
-- comment above `member_permissions_select` in
-- 20260903204157_rls_policies.sql previously claimed sensitive fields are
-- "additionally redacted application-side in the repository mapper (Task
-- 10)". No mapper performs any such redaction. That comment has been
-- corrected in place in the original migration file (comment-only edit,
-- doesn't change already-applied schema). Restating the accurate state
-- here as well, since this is the natural place a future reader checking
-- "did we lock this down" will look:
--
--   RLS on member_permissions scopes which ROWS are visible per circle; it
--   does NOT redact individual sensitive COLUMNS (e.g. routines.title /
--   routines.description for medication routines) from members who lack
--   canViewMedicationLabels. Column-level protection (a permission-aware
--   view or RPC) is not implemented in Phase 9 — tracked as a known gap
--   for Phase 10, not this phase's scope.

-- INVARIANT (Minor 14, see plan Self-Review Notes): every RLS policy in
-- 20260903204157_rls_policies.sql compares auth.uid()::text against
-- profiles.id / circle_members.user_id. Phase 9 does not enforce that
-- profiles.id equals the corresponding auth.users.id (no FK to auth.users
-- yet, and UuidIdGenerator mints profile ids independently of Supabase
-- Auth). Phase 10's auth cutover MUST reconcile profile ids with real
-- Supabase Auth user ids, or every RLS policy above will silently return
-- zero rows instead of erroring.
