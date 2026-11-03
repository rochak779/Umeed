# Live Data Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `DATA_ADAPTER=supabase` mode, give every visitor a real Supabase account and route all circle data through server functions, so circle members share one source of truth.

**Architecture:** A `config` module is the single reader of mode/env on both server and browser. Every read/write the routes make goes through a per-feature `api` module: in Supabase mode each call is a top-level TanStack `createServerFn` that verifies the caller from the auth cookie, builds service-role repositories server-side, and runs the existing use-case with the verified user as actor; in local mode the same `api` call runs the use-case in the browser against the localStorage container, as today.

**Tech Stack:** TanStack Start (`createServerFn`), `@supabase/ssr`, `@supabase/supabase-js`, zod, Vitest, Bun.

**Spec:** `docs/superpowers/specs/2026-11-03-live-data-connection-design.md`

## Global Constraints

- Service-role key and `createSupabaseServiceClient` are server-only; never imported by a module that ships to the browser.
- Every Supabase client passes `db: { schema: SUPABASE_DB_SCHEMA }`. Never touch `public` or other schemas; never change project-wide Auth settings.
- Migrations via `bun run db:migrate` only. Never `supabase db push`, `db reset --linked`, `supabase link`.
- Server functions never trust an actor/user id from the browser: zod input schemas omit every actor field (`actorId`, `claimerUserId`, `userId` of the caller, etc.); handlers inject the verified user id.
- `createServerFn(...)` calls are declared at module top level (TanStack compiler requirement), never built inside a factory.
- Browser-visible env: `VITE_DATA_ADAPTER` (build-time; decides mode for server and browser — see Session 2 review fix), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Server env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`; a legacy `DATA_ADAPTER` must match `VITE_DATA_ADAPTER` or startup throws.
- `DATA_ADAPTER=local` (and unset) keeps working; existing tests stay green unchanged.
- No visual changes to screens.
- Session 2 = Tasks 1–5 → PR. Session 3 = Tasks 6–11 → PR (stacked on Session 2's branch).

## Review Focus

- Signed-in user calls a circle server function with another circle's id → must get a "not a member" error, never data. (Task 6 test, reused by every module.)
- Sign-up when the shared project requires email confirmation (no session returned) → user lands on `/verify-email`, and their profile is created on first signed-in load, not lost. (Tasks 3–4 tests.)
- Session cookie expired / signed out in another tab while a screen is open → next server call returns unauthenticated and the app redirects to `/sign-in` rather than showing a crash. (Task 2 test + Task 5 manual check.)
- Unauthenticated visitor opens an invite link → preview works without sign-in, but accepting requires sign-in and binds the membership to the verified user. (Task 7 tests.)
- Browser build accidentally imports a server-only module → build check fails. (Task 2 bundle check, re-run in Tasks 5 and 11.)

---

# Session 2 — Real login (branch `feat/live-login`, PR at end)

### Task 1: Single config reader

**Files:**
- Create: `src/shared/config.ts`, `src/shared/config.test.ts`
- Modify: `src/features/authentication/container.ts`, `src/features/authentication/guards.ts`, `src/features/alerts/useAlertsRealtime.ts`, `src/infrastructure/supabase/authClient.ts`, `.env.example`

**Interfaces:**
- Produces: `isSupabaseMode(): boolean`; `publicSupabaseConfig(): { url: string; anonKey: string }` (throws a clear error naming the missing var).

- [ ] **Step 1: Write failing tests** in `config.test.ts`: `isSupabaseMode()` is true when `DATA_ADAPTER=supabase` (server, `process.env`), false when unset or `local`; `publicSupabaseConfig()` returns `SUPABASE_URL`/`SUPABASE_ANON_KEY` on the server and throws `/SUPABASE_URL/` when missing.
- [ ] **Step 2: Run** `bun run vitest run src/shared/config.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `config.ts`: on the server (`typeof window === "undefined"`) read `process.env`; in the browser read `import.meta.env.VITE_DATA_ADAPTER` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- [ ] **Step 4: Replace** every `process.env["DATA_ADAPTER"]` read in the four modified files with `isSupabaseMode()`, and `authClient.ts`'s `requireEnv` URL/anon reads with `publicSupabaseConfig()`. Add the three `VITE_` vars to `.env.example` with a one-line comment that they must mirror the server values.
- [ ] **Step 5: Run** `bun run vitest run src` and `npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `feat: single config reader for adapter mode and public Supabase env`

### Task 2: Server actor resolution and bundle guard

**Files:**
- Create: `src/server/actor.ts`, `src/server/actor.test.ts`, `src/server/serverDeps.ts`, `scripts/check-client-bundle.sh`
- Modify: `package.json` (add `"check:bundle": "scripts/check-client-bundle.sh"`)

**Interfaces:**
- Produces:
  - `class UnauthenticatedError extends Error` (message `"unauthenticated"`).
  - `resolveActor(getUser: () => Promise<{ id: string; email: string } | null>): Promise<{ userId: string; email: string }>` — throws `UnauthenticatedError` when `getUser` returns null.
  - `currentActor(): Promise<{ userId: string; email: string }>` — calls `resolveActor` with the per-request server auth client's `auth.getUser()`.
  - `buildServerDeps(): AppDeps` in `serverDeps.ts` — service-role repositories (same set `container.buildRepositories` builds in Supabase mode) plus `clock`, `idGenerator`, `eventBus`, `notificationGateway`. Export `type AppDeps`.
- Consumes: `getSupabaseAuthClient` (server branch), `createSupabaseServiceClient`.

- [ ] **Step 1: Write failing tests:** `resolveActor` returns `{userId, email}` for a user; throws `UnauthenticatedError` for null.
- [ ] **Step 2: Run** `bun run vitest run src/server/actor.test.ts` → FAIL.
- [ ] **Step 3: Implement** `actor.ts` and `serverDeps.ts`. `serverDeps.ts` is the only file outside `container.ts` that imports `createSupabaseServiceClient`.
- [ ] **Step 4: Write** `check-client-bundle.sh`: run `bun run build`, then fail (exit 1, print the file) if `SUPABASE_SERVICE_ROLE_KEY`, `createSupabaseServiceClient`, or the actual value of `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (if set) appears under the client output directory (`.output/public` or `.vercel/output/static`, whichever exists).
- [ ] **Step 5: Run** tests → PASS; `bun run check:bundle` → exits 0.
- [ ] **Step 6: Commit** `feat: verified server actor, server-side deps and client bundle guard`

### Task 3: Sign-up and sign-in under either Auth setting

**Files:**
- Modify: `src/application/ports/infra.ts` (`AuthResult` failure codes), `src/infrastructure/supabase/auth/SupabaseAuthProvider.ts`, its test (create `src/infrastructure/supabase/auth/SupabaseAuthProvider.test.ts` if absent), `src/routes/sign-up.tsx`, `src/routes/sign-in.tsx`

**Interfaces:**
- Produces: `AuthResult` failure codes gain `"confirmation_required"` (register returned a user but no session) and `"email_not_confirmed"` (sign-in rejected because email unconfirmed; Supabase error code `email_not_confirmed`).

- [ ] **Step 1: Write failing tests** with a stubbed Supabase client: `register` → `{ok:false, code:"confirmation_required"}` when `signUp` returns `user` but `session: null`; `signIn` → `{ok:false, code:"email_not_confirmed"}` when error code is `email_not_confirmed`; existing `invalid_credentials` path unchanged.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** in `SupabaseAuthProvider`; update the class comment (it currently assumes "Confirm email" is off).
- [ ] **Step 4: Routes:** sign-up navigates to `/verify-email` on `confirmation_required` (same as success today); sign-in shows "Please confirm your email first — check your inbox." on `email_not_confirmed`.
- [ ] **Step 5: Run** `bun run test` (local-mode suites) and `npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `feat: handle email-confirmation-required sign-up and sign-in`

### Task 4: Session state from the server, profile ensured server-side

**Files:**
- Create: `src/features/authentication/sessionApi.ts`, `src/features/authentication/sessionApi.test.ts`
- Modify: `src/features/authentication/SessionContext.tsx`, `src/routes/sign-up.tsx`, `src/routes/invite.$token.tsx` (its `registerAccount` call only)

**Interfaces:**
- Consumes: `currentActor`, `buildServerDeps`, `isSupabaseMode`.
- Produces:
  - `loadSessionStateFor(deps: AppDeps, actor: {userId; email; displayName}): Promise<{ profile: UserProfile; memberships: ActiveMembership[] }>` — creates the profile (same fields `registerAccount` writes, `displayName` from Supabase user metadata `display_name`, falling back to the email's local part) if none exists, then loads memberships exactly as `SessionContext.load` does today.
  - `loadSessionStateFn` — top-level `createServerFn({method:"GET"})` wrapping it with `currentActor()`; returns `null` when unauthenticated.
  - `api.session.load(): Promise<{session; profile; memberships} | null>` and `api.session.register(input: RegisterAccountInput): Promise<AuthResult>` — Supabase mode: `register` calls `container.authProvider.register` in the browser only (profile comes from `load`); local mode: unchanged `registerAccount` / current load logic.

- [ ] **Step 1: Write failing tests** for `loadSessionStateFor` with local in-memory repositories: creates a profile when missing with `id === actor.userId` and the given display name; does not overwrite an existing profile; returns only circles where the member is active.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `sessionApi.ts`.
- [ ] **Step 4: Switch** `SessionContext.load` to `api.session.load()` and sign-up / invite registration to `api.session.register`. `ActiveMembership` type stays in `SessionContext.tsx`.
- [ ] **Step 5: Run** `bun run test`, `npx tsc --noEmit`, `bun run check:bundle` → PASS.
- [ ] **Step 6: Commit** `feat: load session state and ensure profile on the server in Supabase mode`

### Task 5: Session 2 verification and PR

- [ ] **Step 1:** Add the three `VITE_` vars to `.env.local` mirroring the existing values; set `DATA_ADAPTER=supabase` for this run only (restore `local` afterwards).
- [ ] **Step 2: Manual check** on `bun run dev` with two separate browser profiles and a throwaway `@example.test` account: sign up → reach app (or `/verify-email` if the shared project requires confirmation — record which); sign in from browser 2 → same name shown; refresh keeps you signed in; sign out in browser 1 then act in browser 1 → redirected to `/sign-in`; forgot-password request returns the confirmation screen.
- [ ] **Step 3:** Delete the throwaway auth users and their `umeed.profiles` rows (service-role script in the scratchpad, `umeed` schema only).
- [ ] **Step 4: Run** `bun run test`, `bun run lint`, `npx tsc --noEmit`, `bun run check:bundle`. Lint: fix only files this session touched; record pre-existing lint errors in the PR.
- [ ] **Step 5:** Push `feat/live-login`, open PR "Go-live Session 2: real login" (summary, manual-check results, known gaps: data screens still use the container until Session 3, so Supabase mode is not usable end-to-end yet).

---

# Session 3 — Shared data (branch `feat/live-shared-data`, from `feat/live-login`, PR at end)

### Task 6: Membership guard and the circle API

**Files:**
- Create: `src/server/membership.ts`, `src/server/membership.test.ts`, `src/features/circle/circleApi.ts`, `src/features/circle/circleApi.test.ts`
- Modify: `src/routes/app.circle.tsx`, `src/routes/onboarding.tsx`

**Interfaces:**
- Produces:
  - `class NotAMemberError extends Error`; `requireActiveMember(deps: AppDeps, userId: string, circleId: string): Promise<CircleMember>` — throws `NotAMemberError` unless the user's membership in that circle is `active`.
  - Pattern every later API module follows: for each operation, a pure `xxxFor(deps: AppDeps, actorId: string, input: XxxInput)` (calls `requireActiveMember` first when the input names a circle, then the use-case with `actorId` injected), a top-level `xxxFn = createServerFn(...).inputValidator(zodSchema).handler(({data}) => xxxFor(buildServerDeps(), (await currentActor()).userId, data))`, and `api.<area>.xxx(input)` choosing `xxxFn({data: input})` vs `xxxFor(localDeps(), localUserId, input)` by `isSupabaseMode()`.
  - `localDeps(): AppDeps` and `localUserId(): Promise<string>` in `src/features/authentication/container.ts`.
  - `api.circle`: `roster`, `invite`, `reorder`, `revokePermission`, `requestLeave`, `setPaused`, `start` — one per use-case/read `app.circle.tsx` and `onboarding.tsx` call today.

- [ ] **Step 1: Write failing tests:** `requireActiveMember` accepts an active member, rejects a non-member and a member whose status isn't `active`. In `circleApi.test.ts`: `rosterFor(deps, outsiderId, {circleId})` rejects with `NotAMemberError`; `inviteFor` records the invitation with `invitedBy === actorId` even when the input object carries a different `actorId` (zod strips it — test the schema's `.parse` too).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** membership guard, `localDeps`/`localUserId`, `circleApi.ts`.
- [ ] **Step 4: Rewire** `app.circle.tsx` and `onboarding.tsx` to `api.circle.*`; no remaining `container.` references in those two files.
- [ ] **Step 5: Run** `bun run test`, `npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `feat: circle API behind server functions with membership guard`

### Task 7: Invitations API

**Files:**
- Create: `src/features/invitations/invitationApi.ts`, `.test.ts`
- Modify: `src/routes/invite.$token.tsx`

**Interfaces:**
- Produces: `api.invitation.preview({token})` — no sign-in required, returns only what `previewInvitation` returns today; `api.invitation.accept({token})` — requires sign-in, membership bound to the verified user.

- [ ] **Step 1: Write failing tests:** `previewFor(deps, {token})` works with no actor; `acceptFor(deps, actorId, {token})` creates the membership for `actorId`; unknown token → the use-case's existing error.
- [ ] **Step 2–5:** Run → FAIL; implement; rewire route (its `signIn` call stays on `container.authProvider`); run tests → PASS.
- [ ] **Step 6: Commit** `feat: invitation preview and accept via server functions`

### Task 8: Routines, older-adult home, consent and settings APIs

**Files:**
- Create: `src/features/routines/routineApi.ts`, `src/features/consent/consentApi.ts`, `src/features/settings/settingsApi.ts`, each with a `.test.ts`
- Modify: `src/routes/app.routines.tsx`, `src/routes/app.older-adult.home.tsx`, `src/routes/app.consent.tsx`, `src/routes/app.settings.tsx`

**Interfaces:**
- Produces: `api.routine.{list, create, setPaused, permission, nextForOlderAdult, acknowledge, raiseHelp}`, `api.consent.{list, set}`, `api.settings.{preferences, updatePreference, saveProfile}` — one per call those routes make today. `saveProfile` may only update the actor's own profile.

- [ ] **Step 1: Write failing tests:** non-member rejected for `list`/`create`; `saveProfileFor(deps, actorId, {...})` ignores any `id` in input and writes `actorId`'s profile; `raiseHelpFor` records the alert as raised by `actorId`.
- [ ] **Step 2–5:** Run → FAIL; implement; rewire the four routes (no `container.` left except `container.clock` for display); run → PASS.
- [ ] **Step 6: Commit** `feat: routines, consent and settings via server functions`

### Task 9: Alerts API, dashboard, due-work and Realtime

**Files:**
- Create: `src/features/alerts/alertApi.ts`, `.test.ts`; `supabase/migrations/<timestamp>_umeed_alerts_realtime.sql`
- Modify: `src/routes/app.alerts.tsx`, `src/routes/app.index.tsx`, `src/routes/app.tsx`, `src/features/alerts/useAlertsRealtime.ts` (+ its test)

**Interfaces:**
- Produces: `api.alert.{list, recipients, claim, resolve, recentActivity}`; `api.dueWork.run()` — runs `pollDueWork` server-side (requires sign-in) in Supabase mode, unchanged browser call in local mode. (Session 4 replaces this with the scheduled job.)

- [ ] **Step 1: Write failing tests:** `claimFor(deps, actorId, {alertId})` claims as `actorId` and rejects a non-member of the alert's circle; `useAlertsRealtime` subscribes with `schema: "umeed"`.
- [ ] **Step 2–3:** Run → FAIL; implement API and hook fix.
- [ ] **Step 4: Migration:** `alter publication supabase_realtime add table umeed.alerts;` guarded so re-running is a no-op (check `pg_publication_tables` first in a `do $$ ... $$` block). Nothing outside `umeed.alerts` is touched.
- [ ] **Step 5: Apply** with `bun run db:migrate` (needs a working `SUPABASE_DB_URL`; if it still fails authentication, stop and ask Rochak to refresh it).
- [ ] **Step 6:** Rewire the three routes; run `bun run test`, `npx tsc --noEmit` → PASS.
- [ ] **Step 7: Commit** `feat: alerts via server functions and live updates on umeed.alerts`

### Task 10: Lock the browser out of repositories; repeatable contract tests

**Files:**
- Modify: `src/features/authentication/container.ts` (+ test), `test/contracts/supabaseFixtures.ts`, `test/contracts/supabaseRepositories.contract.test.ts`, `test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts`

- [ ] **Step 1: Write failing test:** in Supabase mode in a browser-like environment, accessing `container.alertRepository` (any repository) throws `/server functions/`.
- [ ] **Step 2–3:** Run → FAIL; make container repositories lazy getters that throw in that case; local mode unchanged.
- [ ] **Step 4:** `grep -rn "container\.\(.*Repository\)" src/routes src/features` returns only local-mode code paths inside `localDeps`.
- [ ] **Step 5:** Fix contract-test cleanup: `resetVolatileContractRows` deletes all rows belonging to the fixed test circles (`c-1`, `c-2`, `circle-1`) and test routines before each suite, so the suite passes on a dirty database. Run `bun run test` twice in a row → all 307+ tests PASS both times.
- [ ] **Step 6: Commit** `feat: forbid browser repository access in Supabase mode; repeatable contract tests`

### Task 11: Session 3 verification and PR

- [ ] **Step 1:** `DATA_ADAPTER=supabase` + `VITE_` vars, `bun run dev`, three browser profiles, throwaway `@example.test` accounts: coordinator creates circle and invites → older adult accepts and consents → coordinator adds a routine and invites a neighbour who accepts → older adult raises a help alert → neighbour claims → coordinator's alerts screen shows it claimed without refresh.
- [ ] **Step 2: Isolation check:** a second coordinator's account calls `api.circle.roster` with the first circle's id from the console → `NotAMemberError`, no data.
- [ ] **Step 3:** Clean up throwaway auth users and their `umeed` rows; restore `.env.local` to `local`.
- [ ] **Step 4:** `bun run test`, `bun run lint` (touched files), `npx tsc --noEmit`, `bun run check:bundle` → PASS.
- [ ] **Step 5:** Update README "Scope & limits" (browser connection fixed; scheduled job still off) and the go-live memory.
- [ ] **Step 6:** Push `feat/live-shared-data`, open PR "Go-live Session 3: shared data" with base `feat/live-login` (retarget to `main` once Session 2 merges).
