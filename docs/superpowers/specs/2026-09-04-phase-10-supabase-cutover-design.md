# Phase 10 — Supabase cutover and server-side scheduling — design

Date: 2026-09-04

## 1. Purpose

Implementation.md Phase 10 ("Supabase cutover and server-side scheduling") is
the next unstarted phase. Phases 0–9 are complete: domain/application layers,
local adapters, the full route set, mock communications, and Supabase schema
+ repository adapters behind the existing ports all already exist. The
`umeed` Supabase project (ref `focqwbtnltixlzfvovcn`, eu-west-2) is live and
has all six migrations applied; `.env.local` already holds working keys for
it, pointed at `DATA_ADAPTER=local` for now.

This document scopes exactly what Phase 10 adds on top of that: real
authentication, live cross-session updates on alerts, and scheduling that
survives no browser tab being open.

## 2. Non-goals

Out of scope for this phase (later phases per Implementation.md):

- Twilio / real SMS / voice (Phase 11).
- Production email provider — Supabase's built-in test-mode sender is used
  for verification/reset email during this phase.
- Realtime on anything other than `alerts` (occurrence acknowledgements stay
  poll/refresh-based).
- Any change to auth-related UI screens — only what's behind them changes.
- Final deployment/rollback documentation (Phase 12).

## 3. Auth cutover

### 3.1 New dependency

`@supabase/ssr` — cookie-based session helpers compatible with TanStack
Start's server request/response cycle. `@supabase/supabase-js` is already a
dependency.

### 3.2 `SupabaseAuthProvider`

Implements the existing `AuthProvider` port (`src/application/ports/infra.ts`)
unchanged — no caller (routes, `SessionContext`, `guards.ts`) changes its
call sites or the shape of `Session`/`AuthResult`.

Two methods require real adaptation because Supabase's actual mechanics
differ from `LocalAuthProvider`'s manual-token shape, even though the
external interface is identical:

- **`verifyEmail(token)`**: Supabase's email-verification link, when clicked,
  has Supabase itself establish a Supabase session for that user (it does not
  hand the app a bare token to redeem). The adapter treats "the user arrived
  on the verification redirect with an active Supabase session whose email is
  confirmed" as verification having already succeeded, and returns
  accordingly — it does not perform a second manual token-redemption call.
- **`resetPassword({ token, newPassword })`**: Supabase's recovery link
  similarly establishes a temporary recovery session directly. The adapter
  uses that active session to call `supabase.auth.updateUser({ password })`
  rather than redeeming `token` as an opaque value itself. `token` in the
  input is accepted for interface compatibility but the adapter's real
  precondition is "an active recovery session exists" — if none does, it
  returns `{ ok: false, code: "invalid_or_expired_token" }`.

All other methods (`register`, `signIn`, `signOut`, `requestPasswordReset`,
`getSession`, `onSessionChange`, `isEmailVerified`) map directly onto the
corresponding `supabase-js` / `@supabase/ssr` calls.

### 3.3 Session storage

`getSession()` reads the `sb-*` auth cookie via `@supabase/ssr`'s server
client instead of `localStorage`. This makes `requireSession()` in
`src/features/authentication/guards.ts` a real server-side check instead of
the documented no-op-during-SSR behavour that comment currently describes —
that comment and the corresponding known-limitation note should be updated
or removed as part of implementation.

### 3.4 Wiring

`container.ts` gains an `authProvider` branch mirroring the existing
`buildRepositories()` pattern:

```ts
function buildAuthProvider() {
  if (process.env["DATA_ADAPTER"] === "supabase") {
    return new SupabaseAuthProvider(/* server + browser clients */);
  }
  return new LocalAuthProvider(store, new SystemClock());
}
```

No new environment variable — `DATA_ADAPTER` continues to govern both repos
and auth together, since a mixed local-auth/Supabase-data (or vice versa)
configuration has no real use case.

### 3.5 Email

Verification and password-reset email use Supabase's built-in test-mode
sender. No SMTP/provider configuration this phase. This is rate-limited and
not meant for real end users — acceptable for now, revisit at Phase 11/12.

## 4. Realtime

A Supabase Realtime subscription on the `alerts` table, filtered to
`care_circle_id = <active circle>`, established once a membership is known
(in `SessionContext` or a small dedicated hook consumed by the alert-facing
screens). On any INSERT/UPDATE for that circle's alerts, the subscriber
re-fetches the affected alert through the existing `AlertRepository` /
`getAlertsForCircle` use case — Realtime is purely the "something changed,
refetch" signal, never a second source of truth for alert state.

Scope is `alerts` only. This directly covers the Phase 10 acceptance
criterion: two open browser sessions see an alert claim/resolve/status change
without a manual refresh.

## 5. Server-side scheduling

- New migration enabling the `pg_cron` and `pg_net` extensions on the
  project.
- New Edge Function, `supabase/functions/poll-due-work`, that runs the same
  logic as the existing `pollDueWork` application use case
  (`src/application/use-cases/pollDueWork.ts`), wired to the Supabase
  repository adapters and the service-role client (server-side secret,
  never shipped to the browser).
- A `pg_cron` job invokes that function via `pg_net` on a fixed interval
  (every minute, matching Implementation.md §11.5's "short interval" guidance
  for the local scheduler it replaces).
- Idempotency is inherited from the DB-level guarantees already specified in
  Implementation.md §12 (`routineId + scheduledForUtc` uniqueness,
  idempotency-keyed communication attempts) and already reflected in the
  Phase 9 schema — a duplicate or overlapping invocation is a no-op, not a
  double-send. No new idempotency mechanism is introduced by this phase.

## 6. Error handling

- **Auth**: the existing `AuthResult`/error-code union is preserved end to
  end, so existing sign-up/sign-in/reset UI error states keep working with
  no changes.
- **Realtime**: a subscription failure or disconnect degrades silently to
  whatever the page last fetched — it never blocks rendering. Reconnection
  triggers a refetch rather than assuming missed events were queued.
- **Scheduler**: Edge Function failures are logged via Supabase function
  logs, redacted the same way analytics events already are (Implementation.md
  §15 — no names, health details, or contact info). A missed or failed cron
  tick self-heals on the next tick because processing re-evaluates current DB
  state rather than draining an in-memory queue.

## 7. Testing

- Contract tests for `SupabaseAuthProvider` covering the same behavioural
  contract already exercised in `LocalAuthProvider.test.ts` (register,
  duplicate email, sign in/out, session restore, password reset happy/expired
  path, email verification happy/expired path), added alongside the existing
  `test/contracts/supabaseRepositories.contract.test.ts` /
  `supabaseRls.contract.test.ts` suites.
- An integration test for the Edge Function's occurrence/escalation logic —
  either invoking the deployed function directly against the test project, or
  exercising the extracted pure `pollDueWork`-equivalent logic it wraps, to
  confirm duplicate/overlapping invocations produce no duplicate transitions
  or notifications.
- Manual two-tab verification of Realtime claim propagation, matching the
  concrete Phase 10 acceptance criterion in Implementation.md.
- The full local unit/integration suite (`bun run test`) must keep passing
  with zero Supabase requirement — unchanged from the existing release-gate
  rule; Supabase-dependent contract tests remain the ones already
  gated/skipped without credentials.

## 8. Rollout

Once `SupabaseAuthProvider` passes its contract tests and the Edge
Function/cron job are deployed and verified, this project's `.env.local`
switches to `DATA_ADAPTER=supabase` for real local usage of the app. Local
mode (`DATA_ADAPTER=local`, the default for automated tests) remains fully
available and is not removed or degraded by this phase — flipping the env
var back gives a working local-only app exactly as before.

## 9. Acceptance criteria (from Implementation.md Phase 10)

- Two browser sessions update when an alert is claimed.
- Atomic claim race test passes (already true via the existing `claim_alert`
  RPC + `SupabaseAlertRepository.tryClaim`, re-verified under this phase's
  auth).
- Scheduled jobs are idempotent.
- Authenticated cross-circle access is denied (already enforced by existing
  RLS policies from Phase 9; re-verified with real auth identities instead of
  service-role test fixtures).
- Revoked access disappears without relying solely on client state.
- Local automated tests remain available without Supabase.
