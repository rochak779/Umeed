# Live data connection — design

Date: 2026-11-03
Covers: go-live Sessions 1–3 (design, real login, shared data)

## 1. Intent

Rochak wants Umeed on a public Vercel link where **anyone who tries it gets a
working app**: a real account that works on any device, and a care circle
whose members (older adult, family, neighbour) all see the same data and the
same alerts. It is a try-out, not a service real families depend on.

Today that is impossible. In `DATA_ADAPTER=supabase` mode the server renders
with Supabase, but once the page hydrates, the browser reads
`process.env["DATA_ADAPTER"]` as `undefined` and silently falls back to the
localStorage adapters (`Implementation.md` ~line 1555). Every visitor gets a
private, browser-only copy of the app.

## 2. Goals, non-goals, anti-goals

**Goals**

- Sign-up, sign-in, sign-out and password reset work against Supabase Auth and
  survive a refresh or a different device. Email + password only.
- Every screen reads and writes through Supabase, so all members of a circle
  share one source of truth.
- The alerts screen updates live when another member claims or resolves an
  alert.
- `DATA_ADAPTER=local` (no Supabase needed) keeps working for local
  development and the existing automated tests.

**Non-goals**

- Phone calls, SMS, email alerts (no Twilio for this launch).
- The scheduled escalation job (Session 4).
- Deployment itself (Session 5).
- Column-level hiding of medication labels from members without
  `canViewMedicationLabels` (known Phase 9 gap; stays a known gap).
- Any visual change to screens.

**Anti-goals** (would be a failure even if the app "works")

- The service-role key, or anything that bypasses the database's privacy
  rules, reaching the browser.
- A signed-in user being able to read or change another circle's data by
  calling the API directly.
- Changing anything outside the `umeed` schema, or project-wide Auth settings,
  in the shared "Rochak's Hobby" Supabase project (`docs/shared-supabase-db.md`).

## 3. Constraints found during recon

1. **Writes have no database-level permission rules.** The Phase 9 RLS
   migration defines `select` policies only (plus self-update on `profiles`
   and `notification_preferences`). Every insert/update — creating circles,
   inviting, accepting invitations, claiming alerts, consent — is unprotected
   at the database level.
2. **All permission rules live in the use-cases**, which routes currently call
   directly in the browser via `container`. Code running in the browser can be
   bypassed by anyone with dev tools.
3. The repositories are built with the **service-role client**
   (`container.ts`), which must never ship to the browser.
4. Routes touch ~20 use-cases and ~15 direct repository reads (`container.*`
   calls in `src/routes/*`).
5. `useAlertsRealtime` subscribes to `schema: "public"` — should be `umeed` —
   and no migration adds `umeed.alerts` to the `supabase_realtime`
   publication, so live updates would never fire.
6. `SupabaseAuthProvider.register` treats "sign-up returned no session" as a
   failure. That only holds if "Confirm email" is off. The shared project's
   Auth settings are project-wide, so Umeed must not depend on either setting.
7. Browser code only sees `import.meta.env.VITE_*` values (Lovable config
   `envDefine`), never bare `process.env`.

## 4. Decision: run app logic on the server

All reads and writes go through **TanStack Start server functions**
(`createServerFn`). The browser never constructs a repository.

Each server function:

1. Resolves the caller from the request's auth cookie using the existing
   per-request server auth client (`getSupabaseAuthClient()` server branch →
   `auth.getUser()`, which revalidates the token with Supabase).
   No valid user → `401`-style error; the route redirects to `/sign-in`.
2. Builds the service-role repositories **on the server only**.
3. Runs the existing use-case with the **verified user id as the actor**.
   Never trusts an actor id, user id or role sent from the browser.
4. Returns plain serialisable data.

Why this over the alternatives:

- *Browser talks to Supabase directly, rely on RLS* — would mean writing
  insert/update policies that re-implement every domain rule in SQL (consent
  gating, claim rules, permission checks). Large, duplicated, and easy to get
  subtly wrong.
- *Server functions with the user's own (RLS-bound) client* — needs the same
  missing write policies before anything works.
- **Server functions + service role + verified actor** reuses the use-cases
  and their 297 passing tests as the single source of permission truth. The
  existing `select` policies stay as defence in depth for Realtime.

Local mode: the same server-function API is used, but in
`DATA_ADAPTER=local` each call runs the use-case in the browser against the
localStorage container, exactly as today. One API surface, two backends —
routes don't branch.

## 5. Shape of the change

### 5.1 Configuration

- Browser-visible: `VITE_DATA_ADAPTER`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (the URL and anon key are public by design).
- Server-only: `DATA_ADAPTER`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`.
- One small `config` module is the only place that reads these; everything
  else asks it "am I in Supabase mode?". The browser and server must agree —
  a mismatch fails loudly at startup rather than silently falling back.
- A guard (test or build check) fails if the service-role key name or value
  appears in the client bundle.

### 5.2 Session 2 — real login

- Browser auth client (`createBrowserClient`) reads the `VITE_` values;
  session lives in cookies so the server and browser see the same user.
- `SessionContext`, `requireSession`, `redirectIfAuthenticated` work in
  Supabase mode on both server and browser (the local-mode SSR bail stays).
- Sign-up handles both Auth settings: session returned → into the app; no
  session (confirmation required) → `/verify-email` "check your inbox", and
  sign-in shows a clear "confirm your email first" message instead of
  "invalid credentials".
- Profile row is created server-side with `id = auth user id` (RLS and
  membership checks depend on this).
- Password reset: recovery link → `/reset-password` → new password works.
  `PUBLIC_APP_URL` drives the redirect.

Done when: sign up in one browser, sign in from a second browser/device, see
the same profile; sign out works; password reset works end to end.

### 5.3 Session 3 — shared data

- Add a server-function module per feature area (circle, routines, alerts,
  consent/settings, invitations, older-adult home) wrapping the use-cases and
  reads the routes use today. Routes swap `container.x` / direct use-case
  calls for these functions; screens and behaviour don't change.
- Read functions check membership before returning circle data (a user can
  only load circles they are an active member of). Invitation preview by
  token stays callable without sign-in, returning only what the invite screen
  shows today.
- Realtime: migration adds `umeed.alerts` to `supabase_realtime`; hook
  subscribes to schema `umeed`. The existing `alerts_select` policy limits
  each subscriber to their own circles. Realtime stays a "something changed,
  refetch" signal.
- Migration applied with `bun run db:migrate` only. The stored
  `SUPABASE_DB_URL` currently fails authentication and must be fixed first
  (Rochak resets/copies it from the dashboard).

Done when: three test accounts (coordinator, older adult, neighbour) in three
browsers complete the journey — create circle, invite, accept, consent, add
routine, raise a help alert, neighbour claims, coordinator sees it claimed
without refreshing — and account A cannot load circle B's data by calling a
server function with B's id.

## 6. Testing

- Existing use-case and local-adapter tests must stay green unchanged.
- New tests per server function: rejects unauthenticated callers; uses the
  verified user as actor even when the input claims another user; rejects
  non-members for circle reads.
- Supabase contract tests: fix their cleanup so they pass repeatably (they
  currently fail on 388 leftover rows) — needed to trust the migration.
- Manual multi-browser journey (above) on `localhost` against the shared
  project, with throwaway `@example.test` accounts, cleaned up afterwards.

## 7. Builder's calls (not discussed with Rochak)

- Exact file layout of server-function modules and the error shape.
- Whether reads use TanStack Router loaders or stay in component effects —
  keep whatever each route does today unless it blocks SSR.
- How the local-mode branch is wired inside the API layer.

## 8. Risks

- **Size.** ~35 call sites move behind server functions. Mechanical, but
  Session 3 is the largest session; if it overruns, split it by feature area
  and keep the branch green between parts.
- **Shared Auth settings.** Sign-up emails come from Supabase's built-in
  sender (a few per hour) if "Confirm email" is on. Fine for a try-out.
- **Cloud worker vs Vercel.** `authClient.ts` comments assume Cloudflare; the
  per-request client rule holds on Vercel functions too. No change needed.
