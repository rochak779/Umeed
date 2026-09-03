# Supabase Schema, RLS & Adapter Design (Phase 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map the existing domain model to Postgres tables, write additive migrations with the required constraints, define RLS policies and an atomic-claim RPC, and implement Supabase-backed repository adapters that pass the same contract tests as the local adapters — all behind the existing `application/ports` interfaces, with zero UI/feature code depending on Supabase directly. The app keeps running on `LocalAuthProvider` + local repositories by default; nothing cuts over.

**Architecture:** One Postgres schema (`public`) mirroring the entities in `src/domain/entities/`, enums as `text` + `CHECK` constraints (not native Postgres enums, so future additive migrations don't need `ALTER TYPE`), `jsonb` for `EscalationPolicy.steps` and `AuditEvent.metadata`. All id and foreign-key columns are `text`, not `uuid` — the domain's `IdGenerator` port and the shared `test/contracts/repositoryContract.ts`/`test/builders/entities.ts` fixtures both treat ids as opaque strings (fixture ids like `"c-1"`, `"user-1"` are not UUID-formatted), and that shared contract suite must run unmodified against both Local and Supabase adapters per Phase 9's acceptance criteria. `profiles.id` is **not** FK'd to `auth.users(id)` in this phase — that linkage is Phase 10's concern, once `LocalAuthProvider` is actually replaced. RLS policies still key off `auth.uid()` for the negative tests Phase 9 requires; policies compare `auth.uid()::text` against these `text` columns, and RLS/contract tests create real Supabase Auth users via the service-role admin API purely to obtain a real signed-in JWT, independent of any `profiles` FK. One new `Supabase*Repository` class per port, each satisfying the exact `run*RepositoryContract` functions already in `test/contracts/repositoryContract.ts`. A new `DATA_ADAPTER` env var (`local` default, `supabase` opt-in) branches `src/features/authentication/container.ts` — the sole composition root — between Local and Supabase repositories; `AuthProvider` stays `LocalAuthProvider` regardless (that swap is Phase 10 only).

**Tech Stack:** Supabase CLI (already linked to project `umeed`, ref `focqwbtnltixlzfvovcn`, region `eu-west-2`), `@supabase/supabase-js`, Bun, Vitest, existing `zod` domain schemas.

**Spec:** `/Users/rochakagarwal/orca/projects/Umeed/Implementation.md` — specifically §8 (domain model), §9 (state machines), §11.1 (ports), §12 (time/idempotency), §13 (safety/privacy/permissions), Phase 9 (lines 1230–1274), §17.2 (repository contract tests), §19 (environment configuration). Also read `docs/superpowers/plans/../../../Implementation.md` phase 9 acceptance criteria directly before starting each task.

## Global Constraints

- No UI or feature-layer component may import `@supabase/supabase-js` directly — only `src/infrastructure/supabase/` and `src/features/authentication/container.ts` may.
- Every migration is additive (`CREATE`, never destructive `ALTER`/`DROP` of existing objects — there are none yet, but keep this discipline from migration 1 onward).
- Every table with an `id` primary key uses `text`, matching the domain's opaque string ids (not `uuid` — see Architecture above for why). The application (via `IdGenerator`) always supplies the id on insert; no `DEFAULT` is defined or relied upon by adapters.
- Store timestamps as `timestamptz`; store date-only fields (`startDate`, `endDate`, `scheduledLocalDate`) as `date`; store `HH:MM` fields (`localTime`, `quietHoursStart/End`, `availability.startLocalTime/endLocalTime`) as `text` with a regex `CHECK`.
- Enums are `text` + `CHECK (col IN (...))`, matching the exact string values in the corresponding zod `z.enum([...])` in `src/domain/entities/`.
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_PASSWORD` are server-only; never read them in browser-bundled code.
- Do not commit `.env` or `.env.local` — both are already covered by the `*.local` and default `.env` gitignore conventions; verify before each commit with `git status`.
- All repository adapter methods that violate a uniqueness constraint (duplicate `(routine_id, scheduled_for_utc)`, duplicate `idempotency_key`, re-appending an existing `audit_events.id`) must throw the domain's `ConflictError` (`src/domain/errors/DomainError.ts`), never let a raw Postgres error escape.
- Run `bun run lint`, `bunx tsc --noEmit` (there is no dedicated `typecheck` script in `package.json` — confirmed; use `tsc` directly), and `bun test` after every task; fix failures your task introduced before moving on.

---

## File Structure

```
supabase/
  config.toml                              # from `supabase init`
  migrations/
    <timestamp>_core_identity_and_circles.sql
    <timestamp>_invitations_consent_audit.sql
    <timestamp>_routines_and_occurrences.sql
    <timestamp>_alerts_and_communications.sql
    <timestamp>_rls_policies.sql
src/infrastructure/supabase/
  client.ts                                # createSupabaseServiceClient(), createSupabaseAnonClient()
  mappers/
    profileMapper.ts                       # row <-> UserProfile
    careCircleMapper.ts                    # row <-> CareCircle / CircleMember / MemberPermission
    invitationMapper.ts
    consentMapper.ts                       # ConsentRecord / NotificationPreference
    auditMapper.ts
    routineMapper.ts                       # Routine / EscalationPolicy
    occurrenceMapper.ts
    alertMapper.ts                         # Alert / AlertRecipient
    communicationMapper.ts
  repositories/
    SupabaseProfileRepository.ts
    SupabaseInvitationRepository.ts
    SupabaseCareCircleRepository.ts
    SupabaseConsentRepository.ts
    SupabaseRoutineRepository.ts
    SupabaseOccurrenceRepository.ts
    SupabaseAlertRepository.ts
    SupabaseCommunicationRepository.ts
    SupabaseAuditRepository.ts
test/infrastructure/supabase/
  testAuthUsers.ts                         # createTestAuthUser(), deleteTestAuthUser() via admin API — Task 11 only
test/contracts/
  supabaseFixtures.ts                      # seedFixedContractParents() — Task 7
  supabaseRepositories.contract.test.ts
  supabaseRls.contract.test.ts
.env.example                               # new — names only, no real values
```

---

### Task 1: Supabase project scaffolding, client factory, env config

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `src/infrastructure/supabase/client.ts`
- Create: `.env.example`
- Modify: `.gitignore` (already updated with `supabase/.temp/` this session — verify it's present)
- Modify: `package.json` (add `@supabase/supabase-js` dependency)
- Test: `test/infrastructure/supabase/client.test.ts`

**Interfaces:**
- Produces: `createSupabaseServiceClient(): SupabaseClient` (server-only, uses `SUPABASE_SERVICE_ROLE_KEY`, throws a clear error if the env var is missing rather than silently falling back), `createSupabaseAnonClient(): SupabaseClient` (uses `SUPABASE_ANON_KEY`, for RLS-scoped test clients), both read `SUPABASE_URL` from `process.env`.

- [ ] **Step 1: Initialize the Supabase CLI project files**

```bash
cd /Users/rochakagarwal/orca/projects/Umeed
supabase init --with-vscode-settings=false
```

This creates `supabase/config.toml` and `supabase/.gitignore`. Confirm `supabase/.temp/` is still covered by the repo root `.gitignore` (it already is, added earlier this session).

- [ ] **Step 2: Add `@supabase/supabase-js`**

```bash
bun add @supabase/supabase-js
```

- [ ] **Step 3: Write `.env.example`**

```text
# Adapter selection — see src/features/authentication/container.ts
APP_MODE=local
DATA_ADAPTER=local
COMMUNICATION_ADAPTER=mock

# Supabase — required only when DATA_ADAPTER=supabase or for adapter contract tests
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=

PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Write the client factory**

```typescript
// src/infrastructure/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createSupabaseAnonClient(accessToken?: string): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
```

- [ ] **Step 5: Write the failing test**

```typescript
// test/infrastructure/supabase/client.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";

describe("createSupabaseServiceClient", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("throws a clear error when SUPABASE_URL is missing", () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    expect(() => createSupabaseServiceClient()).toThrow(/SUPABASE_URL/);
  });

  it("builds a client when both env vars are present", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    expect(() => createSupabaseServiceClient()).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails, then passes**

```bash
bun run vitest run test/infrastructure/supabase/client.test.ts
```
Expected before Step 4's file exists: FAIL with module not found. After: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/config.toml .gitignore package.json bun.lock .env.example \
  src/infrastructure/supabase/client.ts test/infrastructure/supabase/client.test.ts
git commit -m "chore: scaffold supabase project and client factory"
```

---

### Task 2: Migration — core identity and circle tables

**Files:**
- Create: `supabase/migrations/0001_core_identity_and_circles.sql`

**Interfaces:**
- Consumes: field lists from `src/domain/entities/profile.ts` (`UserProfileSchema`) and `src/domain/entities/careCircle.ts` (`CareCircleSchema`, `CircleMemberSchema`, `MemberPermissionSchema`).
- Produces: tables `profiles`, `care_circles`, `circle_members`, `member_permissions`; function `set_updated_at()` reused by every later migration.

- [ ] **Step 1: Write the migration**

```bash
supabase migration new core_identity_and_circles
```

Edit the generated file (`supabase/migrations/<timestamp>_core_identity_and_circles.sql`):

```sql
-- Shared trigger function: keeps updated_at current on every UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table profiles (
  id text primary key,
  display_name text not null,
  preferred_name text not null,
  phone text,
  address text,
  email text not null,
  timezone text not null,
  locale text not null,
  accessibility_large_text boolean not null default false,
  accessibility_reduced_motion boolean not null default false,
  accessibility_high_contrast boolean not null default false,
  onboarding_status text not null check (onboarding_status in ('not_started','in_progress','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_idx on profiles (lower(email));
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

create table care_circles (
  id text primary key,
  name text not null,
  older_adult_id text references profiles(id),
  coordinator_id text not null references profiles(id),
  status text not null check (status in ('draft','pending_consent','active','paused','closed','deleted_pending_retention')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_circles_older_adult_idx on care_circles (older_adult_id);
create index care_circles_coordinator_idx on care_circles (coordinator_id);
create trigger care_circles_set_updated_at before update on care_circles
  for each row execute function set_updated_at();

create table circle_members (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  user_id text not null references profiles(id),
  relationship text not null,
  responder_type text not null check (responder_type in ('older_adult','family','nearby_responder','coordinator')),
  is_nearby boolean not null default false,
  priority integer not null check (priority >= 0),
  availability_days_of_week integer[],
  availability_start_local_time text check (availability_start_local_time ~ '^\d{2}:\d{2}$'),
  availability_end_local_time text check (availability_end_local_time ~ '^\d{2}:\d{2}$'),
  preferred_channel text not null check (preferred_channel in ('in_app','push','sms','voice','email')),
  membership_status text not null check (membership_status in ('invited','active','declined','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index circle_members_circle_idx on circle_members (care_circle_id);
create index circle_members_user_idx on circle_members (user_id);
create unique index circle_members_circle_user_idx on circle_members (care_circle_id, user_id);
create trigger circle_members_set_updated_at before update on circle_members
  for each row execute function set_updated_at();

create table member_permissions (
  id text primary key,
  circle_member_id text not null unique references circle_members(id) on delete cascade,
  can_view_routine_status boolean not null default false,
  can_view_routine_names boolean not null default false,
  can_view_medication_labels boolean not null default false,
  can_view_notes boolean not null default false,
  can_view_address boolean not null default false,
  can_receive_alerts boolean not null default false,
  can_manage_routines boolean not null default false,
  can_manage_circle boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

- [ ] **Step 2: Push the migration to the dedicated Supabase project**

```bash
supabase db push --linked
```
Expected: `Applying migration 0001_core_identity_and_circles.sql...` then success. (The project is already linked — `supabase/.temp/linked-project.json` points at ref `focqwbtnltixlzfvovcn`.)

- [ ] **Step 3: Verify against the live project**

```bash
supabase db diff --linked --schema public
```
Expected: no diff (migration already applied matches remote).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_core_identity_and_circles.sql
git commit -m "feat: add core identity and circle tables migration"
```

---

### Task 3: Migration — invitations, consent, notification preferences, audit

**Files:**
- Create: `supabase/migrations/0002_invitations_consent_audit.sql`

**Interfaces:**
- Consumes: `src/domain/entities/invitation.ts` (`InvitationSchema`, including the cross-field refine on email/phone), `src/domain/entities/consent.ts` (`ConsentRecordSchema`, `NotificationPreferenceSchema`, `AuditEventSchema`).
- Produces: tables `invitations`, `consent_records`, `notification_preferences`, `audit_events` (append-only).

- [ ] **Step 1: Write the migration**

```bash
supabase migration new invitations_consent_audit
```

```sql
create table invitations (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  invited_by_user_id text not null references profiles(id),
  invited_email text,
  invited_phone text,
  proposed_responder_type text not null check (proposed_responder_type in ('older_adult','family','nearby_responder','coordinator')),
  proposed_relationship text not null,
  token_hash text not null,
  status text not null check (status in ('pending','accepted','declined','expired','revoked')),
  expires_at timestamptz not null,
  accepted_by_user_id text references profiles(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_contact_required check (invited_email is not null or invited_phone is not null)
);
create unique index invitations_token_hash_idx on invitations (token_hash);
create index invitations_care_circle_idx on invitations (care_circle_id);

create table consent_records (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  subject_user_id text not null references profiles(id),
  consent_type text not null check (consent_type in ('circle_participation','share_address_with_nearby_responder','automated_calls_enabled','data_retention')),
  policy_version text not null,
  status text not null check (status in ('granted','revoked')),
  granted_at timestamptz,
  revoked_at timestamptz,
  recorded_by text not null references profiles(id)
);
create index consent_records_circle_idx on consent_records (care_circle_id);

create table notification_preferences (
  id text primary key,
  user_id text not null references profiles(id),
  care_circle_id text not null references care_circles(id) on delete cascade,
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  enabled boolean not null default true,
  quiet_hours_start text check (quiet_hours_start ~ '^\d{2}:\d{2}$'),
  quiet_hours_end text check (quiet_hours_end ~ '^\d{2}:\d{2}$'),
  timezone text not null,
  urgent_alerts_override_quiet_hours boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index notification_preferences_user_circle_channel_idx
  on notification_preferences (user_id, care_circle_id, channel);
create trigger notification_preferences_set_updated_at before update on notification_preferences
  for each row execute function set_updated_at();

-- Append-only: no UPDATE/DELETE grants at the table-privilege level. The
-- service role still bypasses privileges, so the Supabase adapter itself
-- must additionally guard re-inserting an existing id (see Task 10).
create table audit_events (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  actor_id text not null references profiles(id),
  actor_type text not null check (actor_type in ('user','system')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  "timestamp" timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index audit_events_circle_idx on audit_events (care_circle_id);
revoke update, delete on audit_events from authenticated, anon;
```

- [ ] **Step 2: Push and verify**

```bash
supabase db push --linked
supabase db diff --linked --schema public
```
Expected: migration applies cleanly, no diff after.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/*_invitations_consent_audit.sql
git commit -m "feat: add invitation, consent and append-only audit tables"
```

---

### Task 4: Migration — routines and occurrences

**Files:**
- Create: `supabase/migrations/0003_routines_and_occurrences.sql`

**Interfaces:**
- Consumes: `src/domain/entities/routine.ts` (`RoutineSchema`, `EscalationPolicySchema`, `EscalationStepSchema`, `RoutineOccurrenceSchema`).
- Produces: tables `routines`, `escalation_policies`, `occurrences`, enforcing the `(routine_id, scheduled_for_utc)` uniqueness required by Implementation.md §12 and the `runOccurrenceRepositoryContract` conflict case.

- [ ] **Step 1: Write the migration**

```bash
supabase migration new routines_and_occurrences
```

```sql
create table routines (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  older_adult_id text not null references profiles(id),
  type text not null check (type in ('general_checkin','medication','meal','hydration','appointment_prep','movement','custom')),
  title text not null,
  description text,
  timezone text not null,
  local_time text not null check (local_time ~ '^\d{2}:\d{2}$'),
  days_of_week integer[] not null,
  start_date date not null,
  end_date date,
  grace_period_minutes integer not null check (grace_period_minutes >= 0),
  visibility text not null check (visibility in ('family_and_nearby','family_only','coordinator_only')),
  enabled boolean not null default true,
  notification_channels text[] not null,
  created_by text not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_circle_idx on routines (care_circle_id);
create trigger routines_set_updated_at before update on routines
  for each row execute function set_updated_at();

create table escalation_policies (
  id text primary key,
  routine_id text not null unique references routines(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  steps jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger escalation_policies_set_updated_at before update on escalation_policies
  for each row execute function set_updated_at();

create table occurrences (
  id text primary key,
  routine_id text not null references routines(id) on delete cascade,
  scheduled_for_utc timestamptz not null,
  scheduled_local_date date not null,
  status text not null check (status in ('scheduled','awaiting_response','acknowledged','missed','escalating','resolved','cancelled')),
  acknowledged_at timestamptz,
  acknowledged_by text references profiles(id),
  acknowledgement_channel text check (acknowledgement_channel in ('in_app','voice_keypad','sms')),
  alert_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index occurrences_routine_scheduled_idx on occurrences (routine_id, scheduled_for_utc);
create index occurrences_due_idx on occurrences (scheduled_for_utc, status);
create trigger occurrences_set_updated_at before update on occurrences
  for each row execute function set_updated_at();
```

Note: `occurrences.alert_id` has no FK yet — `alerts` doesn't exist until Task 5, and `alerts.occurrence_id` also needs `occurrences` to exist. Add both FKs at the end of Task 5's migration to avoid a circular forward reference within one migration.

- [ ] **Step 2: Push and verify**

```bash
supabase db push --linked
supabase db diff --linked --schema public
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/*_routines_and_occurrences.sql
git commit -m "feat: add routine, escalation policy and occurrence tables"
```

---

### Task 5: Migration — alerts, communications, atomic claim RPC

**Files:**
- Create: `supabase/migrations/0004_alerts_and_communications.sql`

**Interfaces:**
- Consumes: `src/domain/entities/alert.ts` (`AlertSchema`, `AlertRecipientSchema`, `CommunicationEventSchema`), the `AlertRepository.tryClaim` doc-comment and `LocalAlertRepository.tryClaim` behavior (report §4): `UNCLAIMABLE_STATUSES = {claimed, resolved, unresolved, cancelled}`.
- Produces: tables `alerts`, `alert_recipients`, `communication_events`; function `claim_alert(alert_id text, claimer_id text, claimed_at timestamptz, expires_at timestamptz) returns boolean` — the atomic compare-and-set backing `SupabaseAlertRepository.tryClaim` in Task 10.

- [ ] **Step 1: Write the migration**

```bash
supabase migration new alerts_and_communications
```

```sql
create table alerts (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  occurrence_id text references occurrences(id),
  source text not null check (source in ('missed_routine','direct_help','manual')),
  status text not null check (status in ('open','notifying','unclaimed','claimed','resolved','unresolved','cancelled')),
  severity text not null check (severity in ('routine','urgent')),
  current_stage integer not null default 0 check (current_stage >= 0),
  opened_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text references profiles(id),
  claim_expires_at timestamptz,
  resolved_at timestamptz,
  resolved_by text references profiles(id),
  resolution_code text check (resolution_code in ('spoke_all_okay','checked_in_person_all_okay','older_adult_asked_for_family','professional_assistance_contacted','unable_to_reach','false_or_accidental','other')),
  resolution_note text,
  updated_at timestamptz not null default now()
);
create index alerts_circle_idx on alerts (care_circle_id);
create index alerts_status_idx on alerts (status);
create trigger alerts_set_updated_at before update on alerts
  for each row execute function set_updated_at();

alter table occurrences add constraint occurrences_alert_fk
  foreign key (alert_id) references alerts(id);

create table alert_recipients (
  id text primary key,
  alert_id text not null references alerts(id) on delete cascade,
  circle_member_id text not null references circle_members(id),
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  stage integer not null check (stage >= 0),
  delivery_status text not null check (delivery_status in ('queued','sent','delivered','failed','accepted','declined')),
  provider_reference text,
  sent_at timestamptz,
  delivered_at timestamptz,
  responded_at timestamptz,
  response text
);
create index alert_recipients_alert_idx on alert_recipients (alert_id);

create table communication_events (
  id text primary key,
  alert_id text references alerts(id),
  occurrence_id text references occurrences(id),
  recipient_id text not null references circle_members(id),
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  direction text not null check (direction in ('outbound','inbound')),
  provider_reference text,
  status text not null check (status in ('queued','sent','delivered','failed','accepted','declined')),
  attempt_number integer not null check (attempt_number >= 1),
  error_code text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index communication_events_idempotency_key_idx on communication_events (idempotency_key);
create trigger communication_events_set_updated_at before update on communication_events
  for each row execute function set_updated_at();

-- Atomic claim: single UPDATE ... WHERE ... RETURNING, so two concurrent
-- callers race at the database row-lock level and only one UPDATE affects
-- a row. Mirrors LocalAlertRepository.tryClaim's UNCLAIMABLE_STATUSES set.
create or replace function claim_alert(
  p_alert_id text,
  p_claimed_by text,
  p_claimed_at timestamptz,
  p_claim_expires_at timestamptz
) returns boolean
language plpgsql
security definer
as $$
declare
  v_updated_id text;
begin
  update alerts
  set status = 'claimed',
      claimed_by = p_claimed_by,
      claimed_at = p_claimed_at,
      claim_expires_at = p_claim_expires_at,
      updated_at = p_claimed_at
  where id = p_alert_id
    and status not in ('claimed', 'resolved', 'unresolved', 'cancelled')
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;
```

- [ ] **Step 2: Push and verify**

```bash
supabase db push --linked
supabase db diff --linked --schema public
```

- [ ] **Step 3: Manually verify the race behavior with two concurrent RPC calls**

```bash
supabase db execute --linked --sql "
  select claim_alert(gen_random_uuid(), gen_random_uuid(), now(), now() + interval '5 minutes');
"
```
Expected: `false` (random alert id doesn't exist — confirms the function returns a boolean instead of erroring on a miss). Full concurrent-claim behavior is verified by the contract test in Task 10, not here.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*_alerts_and_communications.sql
git commit -m "feat: add alert, communication tables and atomic claim function"
```

---

### Task 6: Migration — RLS helper function, enable RLS, policies

**Files:**
- Create: `supabase/migrations/0005_rls_policies.sql`

**Interfaces:**
- Consumes: Implementation.md Phase 9 RLS principles (lines 1256–1264) and §13.3 negative test list; `defaultPermissionsFor` in `src/domain/entities/careCircle.ts` for what "minimum necessary disclosure" means for `nearby_responder`.
- Produces: function `is_active_circle_member(circle_id text) returns boolean`; RLS enabled + policies on every table from Tasks 2–5.

- [ ] **Step 1: Write the migration**

```bash
supabase migration new rls_policies
```

```sql
-- True if the calling JWT's user is an active member of the given circle.
create or replace function is_active_circle_member(p_circle_id text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from circle_members
    where care_circle_id = p_circle_id
      and user_id = auth.uid()::text
      and membership_status = 'active'
  );
$$;

alter table profiles enable row level security;
alter table care_circles enable row level security;
alter table circle_members enable row level security;
alter table member_permissions enable row level security;
alter table invitations enable row level security;
alter table consent_records enable row level security;
alter table notification_preferences enable row level security;
alter table audit_events enable row level security;
alter table routines enable row level security;
alter table escalation_policies enable row level security;
alter table occurrences enable row level security;
alter table alerts enable row level security;
alter table alert_recipients enable row level security;
alter table communication_events enable row level security;

-- profiles: a user can read their own row and the profile of anyone who
-- shares an active circle with them (needed to render names in the UI).
create policy profiles_select on profiles for select
  using (
    id = auth.uid()::text
    or exists (
      select 1 from circle_members me
      join circle_members them on them.care_circle_id = me.care_circle_id
      where me.user_id = auth.uid()::text and me.membership_status = 'active'
        and them.user_id = profiles.id and them.membership_status = 'active'
    )
  );
create policy profiles_update_self on profiles for update
  using (id = auth.uid()::text);

create policy care_circles_select on care_circles for select
  using (is_active_circle_member(id));

create policy circle_members_select on circle_members for select
  using (is_active_circle_member(care_circle_id));

-- member_permissions: nearby responders must not read medication/notes
-- columns. Row-level RLS can't hide individual columns, so the sensitive
-- fields are additionally redacted application-side in the repository
-- mapper (Task 10) using this same permission row; RLS here only scopes
-- *which rows* (i.e. which circle) are visible at all.
create policy member_permissions_select on member_permissions for select
  using (
    exists (
      select 1 from circle_members cm
      where cm.id = member_permissions.circle_member_id
        and is_active_circle_member(cm.care_circle_id)
    )
  );

create policy invitations_select on invitations for select
  using (is_active_circle_member(care_circle_id));

create policy consent_records_select on consent_records for select
  using (is_active_circle_member(care_circle_id));

create policy notification_preferences_select on notification_preferences for select
  using (user_id = auth.uid()::text);
create policy notification_preferences_modify on notification_preferences for all
  using (user_id = auth.uid()::text);

create policy audit_events_select on audit_events for select
  using (is_active_circle_member(care_circle_id));
-- No insert/update/delete policy for authenticated/anon: audit_events is
-- written only by the service role (server-side use cases), matching
-- "service-role operations are restricted to backend functions."

create policy routines_select on routines for select
  using (is_active_circle_member(care_circle_id));

create policy escalation_policies_select on escalation_policies for select
  using (
    exists (
      select 1 from routines r
      where r.id = escalation_policies.routine_id
        and is_active_circle_member(r.care_circle_id)
    )
  );

create policy occurrences_select on occurrences for select
  using (
    exists (
      select 1 from routines r
      where r.id = occurrences.routine_id
        and is_active_circle_member(r.care_circle_id)
    )
  );

create policy alerts_select on alerts for select
  using (is_active_circle_member(care_circle_id));

create policy alert_recipients_select on alert_recipients for select
  using (
    exists (
      select 1 from alerts a
      where a.id = alert_recipients.alert_id
        and is_active_circle_member(a.care_circle_id)
    )
  );

create policy communication_events_select on communication_events for select
  using (
    exists (
      select 1 from alerts a
      where a.id = communication_events.alert_id
        and is_active_circle_member(a.care_circle_id)
    )
  );
```

- [ ] **Step 2: Push and verify**

```bash
supabase db push --linked
supabase db diff --linked --schema public
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/*_rls_policies.sql
git commit -m "feat: enable row level security and circle-scoped policies"
```

---

### Task 7: Shared fixture seed helper, profile/invitation adapters

**Files:**
- Create: `test/contracts/supabaseFixtures.ts`
- Create: `src/infrastructure/supabase/mappers/profileMapper.ts`
- Create: `src/infrastructure/supabase/mappers/invitationMapper.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseProfileRepository.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseInvitationRepository.ts`
- Create: `test/contracts/supabaseRepositories.contract.test.ts` (created here, extended in later tasks)

**Interfaces:**
- Consumes: `ProfileRepository`, `InvitationRepository` from `src/application/ports/repositories.ts`; `runProfileRepositoryContract`, `runInvitationRepositoryContract` from `test/contracts/repositoryContract.ts` (both typed `(makeRepository: () => X) => void` — a bare synchronous factory, no seeding hook); `createSupabaseServiceClient` from Task 1.
- Produces: `seedFixedContractParents(client: SupabaseClient): Promise<void>` — a one-time, idempotent (upsert-based) seed of every literal parent-row id the shared `test/contracts/repositoryContract.ts` suite references across ALL nine repositories, so any `run*RepositoryContract` call in Tasks 7–10 can use a bare `() => new SupabaseXRepository(client)` factory exactly like the Local contract test file does — no per-repository seeding logic needed in Tasks 8–10. `class SupabaseProfileRepository implements ProfileRepository`, `class SupabaseInvitationRepository implements InvitationRepository`.

Why this is needed: the migrations in Tasks 2–5 add real foreign-key constraints (`circle_members.user_id references profiles(id)`, `routines.care_circle_id references care_circles(id)`, etc. — required by Implementation.md §19). The existing shared contract suite (`test/contracts/repositoryContract.ts`, `test/builders/entities.ts` — not part of this plan, already written) calls `buildAlert({...})`, `buildCircleMember({...})` etc. with plain literal ids like `"c-1"`, `"user-1"`, `"routine-1"` and never seeds their parent rows, because the Local adapter never enforces FKs. Supabase will. Rather than weakening the schema (FK integrity is spec-required) or rewriting the shared suite (it's also used, unmodified, by the Local contract tests), pre-create every literal id the suite touches once, before any test runs.

- [ ] **Step 1: Write the fixed fixture seed helper**

Read `test/contracts/repositoryContract.ts` and `test/builders/entities.ts` in full first and confirm this exact literal-id inventory still matches (both are fixed files from an earlier phase; if either has changed, adjust the seed lists below to match before proceeding — do not proceed on a stale inventory):
- `profiles`: `user-1`, `user-2`, `coordinator-1`, `older-adult-1`
- `care_circles`: `circle-1`, `c-1`, `c-2` (each `coordinator_id = "coordinator-1"`, `older_adult_id = "older-adult-1"`)
- `routines`: `routine-1`, `r-1`, `r-2` (each `care_circle_id = "circle-1"`, `older_adult_id = "older-adult-1"`, `created_by = "coordinator-1"`)
- `circle_members`: `member-1` (`circle-1`/`user-1`), `m-1` (`c-1`/`user-1`), `m-2` (`c-2`/`user-2`)
- `occurrences`: `occ-1` (`routine_id = "routine-1"`)
- `alerts`: `alert-1` (`care_circle_id = "circle-1"`, `occurrence_id = "occ-1"`)

```typescript
// test/contracts/supabaseFixtures.ts
import type { SupabaseClient } from "@supabase/supabase-js";

const NOW = "2026-01-01T00:00:00.000Z";

/**
 * Idempotently seeds every literal parent-row id the shared
 * test/contracts/repositoryContract.ts suite references, so Supabase's
 * foreign-key constraints don't reject fixture data the Local adapter
 * never had to satisfy. Call once, in a top-level beforeAll, before any
 * run*RepositoryContract(...) call in this file.
 */
export async function seedFixedContractParents(client: SupabaseClient): Promise<void> {
  const { error: profilesError } = await client.from("profiles").upsert([
    profileRow("user-1"),
    profileRow("user-2"),
    profileRow("coordinator-1"),
    profileRow("older-adult-1"),
  ]);
  if (profilesError) throw profilesError;

  const { error: circlesError } = await client.from("care_circles").upsert([
    circleRow("circle-1"),
    circleRow("c-1"),
    circleRow("c-2"),
  ]);
  if (circlesError) throw circlesError;

  const { error: routinesError } = await client.from("routines").upsert([
    routineRow("routine-1"),
    routineRow("r-1"),
    routineRow("r-2"),
  ]);
  if (routinesError) throw routinesError;

  const { error: membersError } = await client.from("circle_members").upsert([
    memberRow("member-1", "circle-1", "user-1"),
    memberRow("m-1", "c-1", "user-1"),
    memberRow("m-2", "c-2", "user-2"),
  ]);
  if (membersError) throw membersError;

  const { error: occurrenceError } = await client.from("occurrences").upsert([
    {
      id: "occ-1",
      routine_id: "routine-1",
      scheduled_for_utc: "2026-01-05T09:00:00.000Z",
      scheduled_local_date: "2026-01-05",
      status: "scheduled",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);
  if (occurrenceError) throw occurrenceError;

  const { error: alertError } = await client.from("alerts").upsert([
    {
      id: "alert-1",
      care_circle_id: "circle-1",
      occurrence_id: "occ-1",
      source: "missed_routine",
      status: "open",
      severity: "urgent",
      current_stage: 0,
      opened_at: NOW,
      updated_at: NOW,
    },
  ]);
  if (alertError) throw alertError;
}

function profileRow(id: string) {
  return {
    id,
    display_name: "Test User",
    preferred_name: "Test",
    email: `${id}@example.invalid`,
    timezone: "Europe/London",
    locale: "en-GB",
    accessibility_large_text: false,
    accessibility_reduced_motion: false,
    accessibility_high_contrast: false,
    onboarding_status: "not_started",
    created_at: NOW,
    updated_at: NOW,
  };
}

function circleRow(id: string) {
  return {
    id,
    name: "Test circle",
    older_adult_id: "older-adult-1",
    coordinator_id: "coordinator-1",
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  };
}

function routineRow(id: string) {
  return {
    id,
    care_circle_id: "circle-1",
    older_adult_id: "older-adult-1",
    type: "medication",
    title: "Morning check-in and tablets",
    timezone: "Europe/London",
    local_time: "09:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_date: "2026-01-01",
    grace_period_minutes: 30,
    visibility: "family_and_nearby",
    enabled: true,
    notification_channels: ["in_app"],
    created_by: "coordinator-1",
    created_at: NOW,
    updated_at: NOW,
  };
}

function memberRow(id: string, careCircleId: string, userId: string) {
  return {
    id,
    care_circle_id: careCircleId,
    user_id: userId,
    relationship: "family",
    responder_type: "family",
    is_nearby: false,
    priority: 0,
    preferred_channel: "in_app",
    membership_status: "active",
    created_at: NOW,
    updated_at: NOW,
  };
}
```

- [ ] **Step 2: Write the profile mapper and repository**

```typescript
// src/infrastructure/supabase/mappers/profileMapper.ts
import type { UserProfile } from "@/domain/entities/profile";

export type ProfileRow = {
  id: string;
  display_name: string;
  preferred_name: string;
  phone: string | null;
  address: string | null;
  email: string;
  timezone: string;
  locale: string;
  accessibility_large_text: boolean;
  accessibility_reduced_motion: boolean;
  accessibility_high_contrast: boolean;
  onboarding_status: UserProfile["onboardingStatus"];
  created_at: string;
  updated_at: string;
};

export function profileToRow(profile: UserProfile): ProfileRow {
  return {
    id: profile.id,
    display_name: profile.displayName,
    preferred_name: profile.preferredName,
    phone: profile.phone,
    address: profile.address,
    email: profile.email,
    timezone: profile.timezone,
    locale: profile.locale,
    accessibility_large_text: profile.accessibilityPreferences.largeText,
    accessibility_reduced_motion: profile.accessibilityPreferences.reducedMotion,
    accessibility_high_contrast: profile.accessibilityPreferences.highContrast,
    onboarding_status: profile.onboardingStatus,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    preferredName: row.preferred_name,
    phone: row.phone,
    address: row.address,
    email: row.email,
    timezone: row.timezone,
    locale: row.locale,
    accessibilityPreferences: {
      largeText: row.accessibility_large_text,
      reducedMotion: row.accessibility_reduced_motion,
      highContrast: row.accessibility_high_contrast,
    },
    onboardingStatus: row.onboarding_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

```typescript
// src/infrastructure/supabase/repositories/SupabaseProfileRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRepository } from "@/application/ports/repositories";
import type { UserProfile } from "@/domain/entities/profile";
import { profileToRow, rowToProfile, type ProfileRow } from "../mappers/profileMapper";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async save(profile: UserProfile): Promise<void> {
    const { error } = await this.client
      .from("profiles")
      .upsert(profileToRow(profile), { onConflict: "id" });
    if (error) throw error;
  }
}
```

- [ ] **Step 3: Write the invitation mapper and repository** (same pattern — snake_case row type, `invitationToRow`/`rowToInvitation`, `SupabaseInvitationRepository implements InvitationRepository` with `findById`, `findByTokenHash` (`.eq("token_hash", tokenHash)`), `findByCareCircle` (`.eq("care_circle_id", careCircleId)`), `save` (upsert on `id`)).

```typescript
// src/infrastructure/supabase/mappers/invitationMapper.ts
import type { Invitation } from "@/domain/entities/invitation";

export type InvitationRow = {
  id: string;
  care_circle_id: string;
  invited_by_user_id: string;
  invited_email: string | null;
  invited_phone: string | null;
  proposed_responder_type: Invitation["proposedResponderType"];
  proposed_relationship: string;
  token_hash: string;
  status: Invitation["status"];
  expires_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function invitationToRow(invitation: Invitation): InvitationRow {
  return {
    id: invitation.id,
    care_circle_id: invitation.careCircleId,
    invited_by_user_id: invitation.invitedByUserId,
    invited_email: invitation.invitedEmail,
    invited_phone: invitation.invitedPhone,
    proposed_responder_type: invitation.proposedResponderType,
    proposed_relationship: invitation.proposedRelationship,
    token_hash: invitation.tokenHash,
    status: invitation.status,
    expires_at: invitation.expiresAt,
    accepted_by_user_id: invitation.acceptedByUserId,
    accepted_at: invitation.acceptedAt,
    revoked_at: invitation.revokedAt,
    created_at: invitation.createdAt,
  };
}

export function rowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    careCircleId: row.care_circle_id,
    invitedByUserId: row.invited_by_user_id,
    invitedEmail: row.invited_email,
    invitedPhone: row.invited_phone,
    proposedResponderType: row.proposed_responder_type,
    proposedRelationship: row.proposed_relationship,
    tokenHash: row.token_hash,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedByUserId: row.accepted_by_user_id,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}
```

```typescript
// src/infrastructure/supabase/repositories/SupabaseInvitationRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvitationRepository } from "@/application/ports/repositories";
import type { Invitation } from "@/domain/entities/invitation";
import { invitationToRow, rowToInvitation, type InvitationRow } from "../mappers/invitationMapper";

export class SupabaseInvitationRepository implements InvitationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations").select("*").eq("id", id).maybeSingle<InvitationRow>();
    if (error) throw error;
    return data ? rowToInvitation(data) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations").select("*").eq("token_hash", tokenHash).maybeSingle<InvitationRow>();
    if (error) throw error;
    return data ? rowToInvitation(data) : null;
  }

  async findByCareCircle(careCircleId: string): Promise<Invitation[]> {
    const { data, error } = await this.client
      .from("invitations").select("*").eq("care_circle_id", careCircleId).returns<InvitationRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToInvitation);
  }

  async save(invitation: Invitation): Promise<void> {
    const { error } = await this.client
      .from("invitations").upsert(invitationToRow(invitation), { onConflict: "id" });
    if (error) throw error;
  }
}
```

- [ ] **Step 4: Write the contract test file**

This file is the single shared entry point Tasks 8–10 extend — each later task adds more `run*RepositoryContract(...)` calls to the bottom of it. It owns exactly one top-level `beforeAll` that seeds the fixed parents once for the whole file.

```typescript
// test/contracts/supabaseRepositories.contract.test.ts
import { beforeAll } from "vitest";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";
import { seedFixedContractParents } from "./supabaseFixtures";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseInvitationRepository } from "@/infrastructure/supabase/repositories/SupabaseInvitationRepository";
import { runProfileRepositoryContract, runInvitationRepositoryContract } from "./repositoryContract";

const client = createSupabaseServiceClient();

beforeAll(async () => {
  await seedFixedContractParents(client);
});

runProfileRepositoryContract(() => new SupabaseProfileRepository(client));
runInvitationRepositoryContract(() => new SupabaseInvitationRepository(client));
```

- [ ] **Step 5: Run against the live project**

```bash
bun run vitest run test/contracts/supabaseRepositories.contract.test.ts
```
Expected: all `runProfileRepositoryContract` and `runInvitationRepositoryContract` cases PASS against the hosted `umeed` Supabase project. If any case fails with a Postgres foreign-key-violation error (`23503`), the literal-id inventory in Step 1 has drifted from the actual test files — re-diff against the current `repositoryContract.ts`/`entities.ts` and extend `seedFixedContractParents` rather than special-casing the failing test.

- [ ] **Step 6: Commit**

```bash
git add test/contracts/supabaseFixtures.ts \
  src/infrastructure/supabase/mappers/profileMapper.ts \
  src/infrastructure/supabase/mappers/invitationMapper.ts \
  src/infrastructure/supabase/repositories/SupabaseProfileRepository.ts \
  src/infrastructure/supabase/repositories/SupabaseInvitationRepository.ts \
  test/contracts/supabaseRepositories.contract.test.ts
git commit -m "feat: add supabase profile and invitation repository adapters"
```

---

### Task 8: Care-circle and consent adapters

**Files:**
- Create: `src/infrastructure/supabase/mappers/careCircleMapper.ts`
- Create: `src/infrastructure/supabase/mappers/consentMapper.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseConsentRepository.ts`
- Modify: `test/contracts/supabaseRepositories.contract.test.ts`

**Interfaces:**
- Consumes: `CareCircleRepository`, `ConsentRepository` ports; `runCareCircleRepositoryContract`, `runConsentRepositoryContract`; the report's note that `findByUserId` must return only circles where the caller's membership row has `membership_status = 'active'`.
- Produces: `class SupabaseCareCircleRepository implements CareCircleRepository` (methods: `findById`, `findByUserId`, `save`, `findMembers`, `findMemberById`, `findMemberByUserAndCircle`, `saveMember`, `findPermission`, `savePermission`), `class SupabaseConsentRepository implements ConsentRepository` (`findByCareCircle`, `save`, `findNotificationPreferences`, `saveNotificationPreference`).

- [ ] **Step 1: Write the care-circle mapper** covering `CareCircle`, `CircleMember` (including the nested `availability` object mapped to/from the three `availability_*` columns, `null` when any are `null`), and `MemberPermission`.

```typescript
// src/infrastructure/supabase/mappers/careCircleMapper.ts
import type { CareCircle, CircleMember, MemberPermission } from "@/domain/entities/careCircle";

export type CareCircleRow = {
  id: string; name: string; older_adult_id: string | null; coordinator_id: string;
  status: CareCircle["status"]; created_at: string; updated_at: string;
};
export function careCircleToRow(c: CareCircle): CareCircleRow {
  return { id: c.id, name: c.name, older_adult_id: c.olderAdultId, coordinator_id: c.coordinatorId, status: c.status, created_at: c.createdAt, updated_at: c.updatedAt };
}
export function rowToCareCircle(r: CareCircleRow): CareCircle {
  return { id: r.id, name: r.name, olderAdultId: r.older_adult_id, coordinatorId: r.coordinator_id, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}

export type CircleMemberRow = {
  id: string; care_circle_id: string; user_id: string; relationship: string;
  responder_type: CircleMember["responderType"]; is_nearby: boolean; priority: number;
  availability_days_of_week: number[] | null;
  availability_start_local_time: string | null;
  availability_end_local_time: string | null;
  preferred_channel: CircleMember["preferredChannel"];
  membership_status: CircleMember["membershipStatus"];
  created_at: string; updated_at: string;
};
export function circleMemberToRow(m: CircleMember): CircleMemberRow {
  return {
    id: m.id, care_circle_id: m.careCircleId, user_id: m.userId, relationship: m.relationship,
    responder_type: m.responderType, is_nearby: m.isNearby, priority: m.priority,
    availability_days_of_week: m.availability?.daysOfWeek ?? null,
    availability_start_local_time: m.availability?.startLocalTime ?? null,
    availability_end_local_time: m.availability?.endLocalTime ?? null,
    preferred_channel: m.preferredChannel, membership_status: m.membershipStatus,
    created_at: m.createdAt, updated_at: m.updatedAt,
  };
}
export function rowToCircleMember(r: CircleMemberRow): CircleMember {
  return {
    id: r.id, careCircleId: r.care_circle_id, userId: r.user_id, relationship: r.relationship,
    responderType: r.responder_type, isNearby: r.is_nearby, priority: r.priority,
    availability: r.availability_start_local_time && r.availability_end_local_time
      ? { daysOfWeek: r.availability_days_of_week ?? [], startLocalTime: r.availability_start_local_time, endLocalTime: r.availability_end_local_time }
      : null,
    preferredChannel: r.preferred_channel, membershipStatus: r.membership_status,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export type MemberPermissionRow = {
  id: string; circle_member_id: string;
  can_view_routine_status: boolean; can_view_routine_names: boolean;
  can_view_medication_labels: boolean; can_view_notes: boolean; can_view_address: boolean;
  can_receive_alerts: boolean; can_manage_routines: boolean; can_manage_circle: boolean;
  granted_at: string; revoked_at: string | null;
};
export function memberPermissionToRow(p: MemberPermission): MemberPermissionRow {
  return {
    id: p.id, circle_member_id: p.circleMemberId,
    can_view_routine_status: p.canViewRoutineStatus, can_view_routine_names: p.canViewRoutineNames,
    can_view_medication_labels: p.canViewMedicationLabels, can_view_notes: p.canViewNotes,
    can_view_address: p.canViewAddress, can_receive_alerts: p.canReceiveAlerts,
    can_manage_routines: p.canManageRoutines, can_manage_circle: p.canManageCircle,
    granted_at: p.grantedAt, revoked_at: p.revokedAt,
  };
}
export function rowToMemberPermission(r: MemberPermissionRow): MemberPermission {
  return {
    id: r.id, circleMemberId: r.circle_member_id,
    canViewRoutineStatus: r.can_view_routine_status, canViewRoutineNames: r.can_view_routine_names,
    canViewMedicationLabels: r.can_view_medication_labels, canViewNotes: r.can_view_notes,
    canViewAddress: r.can_view_address, canReceiveAlerts: r.can_receive_alerts,
    canManageRoutines: r.can_manage_routines, canManageCircle: r.can_manage_circle,
    grantedAt: r.granted_at, revokedAt: r.revoked_at,
  };
}
```

- [ ] **Step 2: Write `SupabaseCareCircleRepository`**

```typescript
// src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CareCircleRepository } from "@/application/ports/repositories";
import type { CareCircle, CircleMember, MemberPermission } from "@/domain/entities/careCircle";
import {
  careCircleToRow, rowToCareCircle, type CareCircleRow,
  circleMemberToRow, rowToCircleMember, type CircleMemberRow,
  memberPermissionToRow, rowToMemberPermission, type MemberPermissionRow,
} from "../mappers/careCircleMapper";

export class SupabaseCareCircleRepository implements CareCircleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<CareCircle | null> {
    const { data, error } = await this.client.from("care_circles").select("*").eq("id", id).maybeSingle<CareCircleRow>();
    if (error) throw error;
    return data ? rowToCareCircle(data) : null;
  }

  async findByUserId(userId: string): Promise<CareCircle[]> {
    const { data, error } = await this.client
      .from("circle_members")
      .select("care_circles(*)")
      .eq("user_id", userId)
      .eq("membership_status", "active")
      .returns<{ care_circles: CareCircleRow }[]>();
    if (error) throw error;
    return (data ?? []).map((row) => rowToCareCircle(row.care_circles));
  }

  async save(circle: CareCircle): Promise<void> {
    const { error } = await this.client.from("care_circles").upsert(careCircleToRow(circle), { onConflict: "id" });
    if (error) throw error;
  }

  async findMembers(careCircleId: string): Promise<CircleMember[]> {
    const { data, error } = await this.client.from("circle_members").select("*").eq("care_circle_id", careCircleId).returns<CircleMemberRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToCircleMember);
  }

  async findMemberById(id: string): Promise<CircleMember | null> {
    const { data, error } = await this.client.from("circle_members").select("*").eq("id", id).maybeSingle<CircleMemberRow>();
    if (error) throw error;
    return data ? rowToCircleMember(data) : null;
  }

  async findMemberByUserAndCircle(userId: string, careCircleId: string): Promise<CircleMember | null> {
    const { data, error } = await this.client
      .from("circle_members").select("*")
      .eq("user_id", userId).eq("care_circle_id", careCircleId).maybeSingle<CircleMemberRow>();
    if (error) throw error;
    return data ? rowToCircleMember(data) : null;
  }

  async saveMember(member: CircleMember): Promise<void> {
    const { error } = await this.client.from("circle_members").upsert(circleMemberToRow(member), { onConflict: "id" });
    if (error) throw error;
  }

  async findPermission(circleMemberId: string): Promise<MemberPermission | null> {
    const { data, error } = await this.client
      .from("member_permissions").select("*").eq("circle_member_id", circleMemberId).maybeSingle<MemberPermissionRow>();
    if (error) throw error;
    return data ? rowToMemberPermission(data) : null;
  }

  async savePermission(permission: MemberPermission): Promise<void> {
    const { error } = await this.client.from("member_permissions").upsert(memberPermissionToRow(permission), { onConflict: "id" });
    if (error) throw error;
  }
}
```

- [ ] **Step 3: Write the consent mapper and `SupabaseConsentRepository`** following the same field-mapping pattern as Step 2, covering `ConsentRecord` (table `consent_records`) and `NotificationPreference` (table `notification_preferences`, `findNotificationPreferences` filtered by `.eq("user_id", userId).eq("care_circle_id", careCircleId)`).

- [ ] **Step 4: Extend the contract test file** — append to the bottom of `test/contracts/supabaseRepositories.contract.test.ts` (below the Task 7 calls, inside the existing `beforeAll`-seeded file — do not add a second `beforeAll` or duplicate the seed call):

```typescript
import { SupabaseCareCircleRepository } from "@/infrastructure/supabase/repositories/SupabaseCareCircleRepository";
import { SupabaseConsentRepository } from "@/infrastructure/supabase/repositories/SupabaseConsentRepository";
import { runCareCircleRepositoryContract, runConsentRepositoryContract } from "./repositoryContract";

runCareCircleRepositoryContract(() => new SupabaseCareCircleRepository(client));
runConsentRepositoryContract(() => new SupabaseConsentRepository(client));
```

No additional seeding is needed here — Task 7's `seedFixedContractParents` already covers every parent id both of these contracts reference (`c-1`/`c-2` care circles, `m-1`/`m-2` members, `user-1`/`user-2` profiles).

- [ ] **Step 5: Run and verify**

```bash
bun run vitest run test/contracts/supabaseRepositories.contract.test.ts
```
Expected: all cases PASS, including `findByUserId` excluding `removed`-status members (report §5).

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/supabase/mappers/careCircleMapper.ts \
  src/infrastructure/supabase/mappers/consentMapper.ts \
  src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts \
  src/infrastructure/supabase/repositories/SupabaseConsentRepository.ts \
  test/contracts/supabaseRepositories.contract.test.ts
git commit -m "feat: add supabase care circle and consent repository adapters"
```

---

### Task 9: Routine and occurrence adapters (uniqueness → ConflictError)

**Files:**
- Create: `src/infrastructure/supabase/mappers/routineMapper.ts`
- Create: `src/infrastructure/supabase/mappers/occurrenceMapper.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseRoutineRepository.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseOccurrenceRepository.ts`
- Modify: `test/contracts/supabaseRepositories.contract.test.ts`

**Interfaces:**
- Consumes: `RoutineRepository`, `OccurrenceRepository` ports; `ConflictError` from `src/domain/errors/DomainError.ts`; the `occurrences_routine_scheduled_idx` unique index from Task 4; `runOccurrenceRepositoryContract`'s requirement that saving a duplicate `(routineId, scheduledForUtc)` under a different id throws `ConflictError`.
- Produces: `class SupabaseRoutineRepository implements RoutineRepository`, `class SupabaseOccurrenceRepository implements OccurrenceRepository` — `save()` on the latter catches the Postgres unique-violation error code (`23505`) on `occurrences_routine_scheduled_idx` and rethrows `ConflictError`.

- [ ] **Step 1: Write the routine mapper** (`Routine` ↔ `routines` row; `EscalationPolicy` ↔ `escalation_policies` row, `steps` passed straight through as the `jsonb` column — no per-field mapping needed since `EscalationStepSchema`'s shape already matches what should be stored).

```typescript
// src/infrastructure/supabase/mappers/routineMapper.ts
import type { Routine, EscalationPolicy } from "@/domain/entities/routine";

export type RoutineRow = {
  id: string; care_circle_id: string; older_adult_id: string; type: Routine["type"];
  title: string; description: string | null; timezone: string; local_time: string;
  days_of_week: number[]; start_date: string; end_date: string | null;
  grace_period_minutes: number; visibility: Routine["visibility"]; enabled: boolean;
  notification_channels: Routine["notificationChannels"]; created_by: string;
  created_at: string; updated_at: string;
};
export function routineToRow(r: Routine): RoutineRow {
  return {
    id: r.id, care_circle_id: r.careCircleId, older_adult_id: r.olderAdultId, type: r.type,
    title: r.title, description: r.description, timezone: r.timezone, local_time: r.localTime,
    days_of_week: r.daysOfWeek, start_date: r.startDate, end_date: r.endDate,
    grace_period_minutes: r.gracePeriodMinutes, visibility: r.visibility, enabled: r.enabled,
    notification_channels: r.notificationChannels, created_by: r.createdBy,
    created_at: r.createdAt, updated_at: r.updatedAt,
  };
}
export function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id, careCircleId: row.care_circle_id, olderAdultId: row.older_adult_id, type: row.type,
    title: row.title, description: row.description, timezone: row.timezone, localTime: row.local_time,
    daysOfWeek: row.days_of_week, startDate: row.start_date, endDate: row.end_date,
    gracePeriodMinutes: row.grace_period_minutes, visibility: row.visibility, enabled: row.enabled,
    notificationChannels: row.notification_channels, createdBy: row.created_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export type EscalationPolicyRow = {
  id: string; routine_id: string; name: string; enabled: boolean;
  steps: EscalationPolicy["steps"]; created_at: string; updated_at: string;
};
export function escalationPolicyToRow(p: EscalationPolicy): EscalationPolicyRow {
  return { id: p.id, routine_id: p.routineId, name: p.name, enabled: p.enabled, steps: p.steps, created_at: p.createdAt, updated_at: p.updatedAt };
}
export function rowToEscalationPolicy(row: EscalationPolicyRow): EscalationPolicy {
  return { id: row.id, routineId: row.routine_id, name: row.name, enabled: row.enabled, steps: row.steps, createdAt: row.created_at, updatedAt: row.updated_at };
}
```

- [ ] **Step 2: Write `SupabaseRoutineRepository`** (`findById`, `findByCareCircle`, `save` all straightforward upserts/selects; `findEscalationPolicy(routineId)` via `.eq("routine_id", routineId).maybeSingle()`; `saveEscalationPolicy` upsert on `id`).

- [ ] **Step 3: Write the occurrence mapper** (`RoutineOccurrence` ↔ `occurrences` row, straightforward field mapping).

- [ ] **Step 4: Write `SupabaseOccurrenceRepository` with explicit conflict translation**

```typescript
// src/infrastructure/supabase/repositories/SupabaseOccurrenceRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OccurrenceRepository } from "@/application/ports/repositories";
import type { RoutineOccurrence } from "@/domain/entities/routine";
import { ConflictError } from "@/domain/errors/DomainError";
import { occurrenceToRow, rowToOccurrence, type OccurrenceRow } from "../mappers/occurrenceMapper";

const RESOLVED_STATUSES = new Set<RoutineOccurrence["status"]>(["resolved", "cancelled"]);

export class SupabaseOccurrenceRepository implements OccurrenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<RoutineOccurrence | null> {
    const { data, error } = await this.client.from("occurrences").select("*").eq("id", id).maybeSingle<OccurrenceRow>();
    if (error) throw error;
    return data ? rowToOccurrence(data) : null;
  }

  async findByRoutineAndScheduledForUtc(routineId: string, scheduledForUtc: string): Promise<RoutineOccurrence | null> {
    const { data, error } = await this.client
      .from("occurrences").select("*")
      .eq("routine_id", routineId).eq("scheduled_for_utc", scheduledForUtc).maybeSingle<OccurrenceRow>();
    if (error) throw error;
    return data ? rowToOccurrence(data) : null;
  }

  async findByRoutine(routineId: string): Promise<RoutineOccurrence[]> {
    const { data, error } = await this.client.from("occurrences").select("*").eq("routine_id", routineId).returns<OccurrenceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToOccurrence);
  }

  async findDue(nowUtc: string): Promise<RoutineOccurrence[]> {
    const { data, error } = await this.client
      .from("occurrences").select("*")
      .lte("scheduled_for_utc", nowUtc)
      .not("status", "in", `(${Array.from(RESOLVED_STATUSES).join(",")})`)
      .returns<OccurrenceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToOccurrence);
  }

  async save(occurrence: RoutineOccurrence): Promise<void> {
    const { error } = await this.client.from("occurrences").upsert(occurrenceToRow(occurrence), { onConflict: "id" });
    if (error) {
      if (error.code === "23505" && error.message.includes("occurrences_routine_scheduled_idx")) {
        throw new ConflictError(
          `Occurrence already exists for routine ${occurrence.routineId} at ${occurrence.scheduledForUtc}`,
        );
      }
      throw error;
    }
  }
}
```

Note: `upsert(..., { onConflict: "id" })` succeeds for same-id updates but a *different* id with the same `(routine_id, scheduled_for_utc)` pair still hits the separate unique index and returns a `23505` — confirm this exact behavior in Step 5 rather than assuming; if `upsert` swallows the error differently than a plain `insert`, switch this method to `insert` for new rows and a conditional `update` for existing ones (check `findById` first) to guarantee the constraint violation surfaces.

- [ ] **Step 5: Extend the contract test file** — append below the existing calls:

```typescript
import { SupabaseRoutineRepository } from "@/infrastructure/supabase/repositories/SupabaseRoutineRepository";
import { SupabaseOccurrenceRepository } from "@/infrastructure/supabase/repositories/SupabaseOccurrenceRepository";
import { runRoutineRepositoryContract, runOccurrenceRepositoryContract } from "./repositoryContract";

runRoutineRepositoryContract(() => new SupabaseRoutineRepository(client));
runOccurrenceRepositoryContract(() => new SupabaseOccurrenceRepository(client));
```

No additional seeding needed — Task 7's `seedFixedContractParents` already covers `routine-1`, `r-1`, `r-2`. Run and confirm the duplicate-occurrence case throws `ConflictError`:

```bash
bun run vitest run test/contracts/supabaseRepositories.contract.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/supabase/mappers/routineMapper.ts \
  src/infrastructure/supabase/mappers/occurrenceMapper.ts \
  src/infrastructure/supabase/repositories/SupabaseRoutineRepository.ts \
  src/infrastructure/supabase/repositories/SupabaseOccurrenceRepository.ts \
  test/contracts/supabaseRepositories.contract.test.ts
git commit -m "feat: add supabase routine and occurrence repository adapters"
```

---

### Task 10: Alert (atomic claim via RPC), communication, audit adapters

**Files:**
- Create: `src/infrastructure/supabase/mappers/alertMapper.ts`
- Create: `src/infrastructure/supabase/mappers/communicationMapper.ts`
- Create: `src/infrastructure/supabase/mappers/auditMapper.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseAlertRepository.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseCommunicationRepository.ts`
- Create: `src/infrastructure/supabase/repositories/SupabaseAuditRepository.ts`
- Modify: `test/contracts/supabaseRepositories.contract.test.ts`

**Interfaces:**
- Consumes: `AlertRepository`, `CommunicationRepository`, `AuditRepository` ports; the `claim_alert` RPC from Task 5; `runAlertRepositoryContract`'s concurrent-claim race case; `runAuditRepositoryContract`'s append-only/no-reuse-of-id case.
- Produces: `class SupabaseAlertRepository implements AlertRepository` — `tryClaim` calls `this.client.rpc("claim_alert", {...})` and returns the boolean result directly (never throws on a lost race, per the port's doc-comment). `class SupabaseAuditRepository implements AuditRepository` — `append` does `insert` (not `upsert`) so a duplicate `id` naturally raises `23505`, caught and rethrown as `ConflictError`.

- [ ] **Step 1: Write the alert mapper** (`Alert` ↔ `alerts` row, `AlertRecipient` ↔ `alert_recipients` row — straightforward field mapping following the Task 8/9 pattern).

- [ ] **Step 2: Write `SupabaseAlertRepository`**

```typescript
// src/infrastructure/supabase/repositories/SupabaseAlertRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRepository } from "@/application/ports/repositories";
import type { Alert, AlertRecipient } from "@/domain/entities/alert";
import {
  alertToRow, rowToAlert, type AlertRow,
  alertRecipientToRow, rowToAlertRecipient, type AlertRecipientRow,
} from "../mappers/alertMapper";

const CLOSED_STATUSES = ["resolved", "unresolved", "cancelled"];

export class SupabaseAlertRepository implements AlertRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Alert | null> {
    const { data, error } = await this.client.from("alerts").select("*").eq("id", id).maybeSingle<AlertRow>();
    if (error) throw error;
    return data ? rowToAlert(data) : null;
  }

  async findByCareCircle(careCircleId: string): Promise<Alert[]> {
    const { data, error } = await this.client.from("alerts").select("*").eq("care_circle_id", careCircleId).returns<AlertRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlert);
  }

  async findOpenByCareCircle(careCircleId: string): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alerts").select("*")
      .eq("care_circle_id", careCircleId)
      .not("status", "in", `(${CLOSED_STATUSES.join(",")})`)
      .returns<AlertRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlert);
  }

  async save(alert: Alert): Promise<void> {
    const { error } = await this.client.from("alerts").upsert(alertToRow(alert), { onConflict: "id" });
    if (error) throw error;
  }

  async tryClaim(alertId: string, claimedBy: string, claimedAt: string, claimExpiresAt: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("claim_alert", {
      p_alert_id: alertId,
      p_claimed_by: claimedBy,
      p_claimed_at: claimedAt,
      p_claim_expires_at: claimExpiresAt,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async findRecipients(alertId: string): Promise<AlertRecipient[]> {
    const { data, error } = await this.client.from("alert_recipients").select("*").eq("alert_id", alertId).returns<AlertRecipientRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlertRecipient);
  }

  async saveRecipient(recipient: AlertRecipient): Promise<void> {
    const { error } = await this.client.from("alert_recipients").upsert(alertRecipientToRow(recipient), { onConflict: "id" });
    if (error) throw error;
  }
}
```

- [ ] **Step 3: Write the communication mapper/repository** (`CommunicationEvent` ↔ `communication_events`; `findByIdempotencyKey` via `.eq("idempotency_key", key)`; `save` upsert on `id`, catching `23505` on `communication_events_idempotency_key_idx` only when it's a genuinely new event id colliding on idempotency key — mirror the pattern from Task 9 Step 4).

- [ ] **Step 4: Write the audit mapper/repository — append-only**

```typescript
// src/infrastructure/supabase/repositories/SupabaseAuditRepository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditRepository } from "@/application/ports/repositories";
import type { AuditEvent } from "@/domain/entities/consent";
import { ConflictError } from "@/domain/errors/DomainError";
import { auditEventToRow, rowToAuditEvent, type AuditEventRow } from "../mappers/auditMapper";

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private readonly client: SupabaseClient) {}

  async append(event: AuditEvent): Promise<void> {
    const { error } = await this.client.from("audit_events").insert(auditEventToRow(event));
    if (error) {
      if (error.code === "23505") {
        throw new ConflictError(`Audit event ${event.id} already exists`);
      }
      throw error;
    }
  }

  async findByCareCircle(careCircleId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.client.from("audit_events").select("*").eq("care_circle_id", careCircleId).returns<AuditEventRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAuditEvent);
  }
}
```

Note: this repository must use the **service-role** client (never the anon/user client), since Task 6's RLS migration grants no `insert` policy for `authenticated`/`anon` on `audit_events` — application code writes audit rows only from trusted server-side use cases.

- [ ] **Step 5: Extend the contract test file** — append below the existing calls:

```typescript
import { SupabaseAlertRepository } from "@/infrastructure/supabase/repositories/SupabaseAlertRepository";
import { SupabaseCommunicationRepository } from "@/infrastructure/supabase/repositories/SupabaseCommunicationRepository";
import { SupabaseAuditRepository } from "@/infrastructure/supabase/repositories/SupabaseAuditRepository";
import {
  runAlertRepositoryContract,
  runCommunicationRepositoryContract,
  runAuditRepositoryContract,
} from "./repositoryContract";

runAlertRepositoryContract(() => new SupabaseAlertRepository(client));
runCommunicationRepositoryContract(() => new SupabaseCommunicationRepository(client));

// audit_events.append() is a plain INSERT (by design — see Task 10 Step 4's
// note on append-only semantics), so re-running this suite against the same
// live project a second time would otherwise hit a false-positive conflict
// on "a-1"/"a-2" left over from the previous run. Clear them first.
beforeAll(async () => {
  await client.from("audit_events").delete().in("id", ["a-1", "a-2"]);
});
runAuditRepositoryContract(() => new SupabaseAuditRepository(client));
```

No additional seeding needed — Task 7's `seedFixedContractParents` already covers `alert-1`, `member-1`. Confirm the concurrent `tryClaim` case (two `Promise.all`-parallel calls, exactly one returns `true`) and the audit append-only case (`append` with a reused `id` throws `ConflictError`) both pass against the live RPC/table.

- [ ] **Step 6: Run the complete contract suite**

```bash
bun run vitest run test/contracts/supabaseRepositories.contract.test.ts
```
Expected: every `run*RepositoryContract` case PASSES for all 9 repositories.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/supabase/mappers/alertMapper.ts \
  src/infrastructure/supabase/mappers/communicationMapper.ts \
  src/infrastructure/supabase/mappers/auditMapper.ts \
  src/infrastructure/supabase/repositories/SupabaseAlertRepository.ts \
  src/infrastructure/supabase/repositories/SupabaseCommunicationRepository.ts \
  src/infrastructure/supabase/repositories/SupabaseAuditRepository.ts \
  test/contracts/supabaseRepositories.contract.test.ts
git commit -m "feat: add supabase alert, communication and audit repository adapters"
```

---

### Task 11: RLS negative tests, adapter selection wiring, docs

**Files:**
- Create: `test/infrastructure/supabase/testAuthUsers.ts`
- Create: `test/contracts/supabaseRls.contract.test.ts`
- Modify: `src/features/authentication/container.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `createSupabaseServiceClient`, `createSupabaseAnonClient(accessToken)` from Task 1; all `Supabase*Repository` classes from Tasks 7–10.
- Produces: `createTestAuthUser(email: string): Promise<{ id: string }>`, `deleteTestAuthUser(id: string): Promise<void>` (used only by this task's RLS tests — no other repository needs a real auth user, since `profiles.id` has no FK to `auth.users` in this phase). `buildContainer(): Container` — replaces the current unconditional `export const container = {...}` with a function reading `process.env.DATA_ADAPTER`, called once at module load so every existing `import { container } from ".../container"` call site keeps working unchanged; branches only the repository set (`AuthProvider` stays `LocalAuthProvider` in both branches — Phase 10 scope).

- [ ] **Step 1: Write the test auth-user helper**

```typescript
// test/infrastructure/supabase/testAuthUsers.ts
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";

export async function createTestAuthUser(email: string): Promise<{ id: string }> {
  const client = createSupabaseServiceClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `test-${crypto.randomUUID()}`,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test auth user: ${error?.message}`);
  }
  return { id: data.user.id };
}

export async function deleteTestAuthUser(id: string): Promise<void> {
  const client = createSupabaseServiceClient();
  await client.auth.admin.deleteUser(id);
}
```

- [ ] **Step 2: Write the four RLS negative tests from Implementation.md §13.3**

```typescript
// test/contracts/supabaseRls.contract.test.ts
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createSupabaseServiceClient, createSupabaseAnonClient } from "@/infrastructure/supabase/client";
import { createTestAuthUser, deleteTestAuthUser } from "../infrastructure/supabase/testAuthUsers";

const service = createSupabaseServiceClient();

async function signInAs(userId: string, email: string) {
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error("failed to generate test session");
  // Exchange for a real session via verifyOtp using the admin-issued token.
  const anon = createSupabaseAnonClient();
  const { data: session, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink", token_hash: data.properties.hashed_token,
  });
  if (verifyError || !session.session) throw new Error("failed to exchange test session");
  return createSupabaseAnonClient(session.session.access_token);
}

describe("RLS negative cases", () => {
  const cleanupUserIds: string[] = [];
  let coordinatorId: string, nearbyResponderId: string, outsiderId: string, circleId: string, memberPermissionId: string;

  beforeAll(async () => {
    const coordinator = await createTestAuthUser(`coord-${crypto.randomUUID()}@example.invalid`);
    const nearby = await createTestAuthUser(`nearby-${crypto.randomUUID()}@example.invalid`);
    const outsider = await createTestAuthUser(`outsider-${crypto.randomUUID()}@example.invalid`);
    coordinatorId = coordinator.id; nearbyResponderId = nearby.id; outsiderId = outsider.id;
    cleanupUserIds.push(coordinatorId, nearbyResponderId, outsiderId);

    for (const id of [coordinatorId, nearbyResponderId, outsiderId]) {
      await service.from("profiles").insert({
        id, display_name: "Test", preferred_name: "Test", email: `${id}@example.invalid`,
        timezone: "Europe/London", locale: "en-GB", accessibility_large_text: false,
        accessibility_reduced_motion: false, accessibility_high_contrast: false, onboarding_status: "complete",
      });
    }

    const circle = await service.from("care_circles").insert({
      id: crypto.randomUUID(), name: "Test circle", coordinator_id: coordinatorId, status: "active",
    }).select("id").single();
    circleId = circle.data!.id;

    const nearbyMember = await service.from("circle_members").insert({
      id: crypto.randomUUID(), care_circle_id: circleId, user_id: nearbyResponderId, relationship: "neighbour",
      responder_type: "nearby_responder", is_nearby: true, priority: 1,
      preferred_channel: "sms", membership_status: "active",
    }).select("id").single();

    const permission = await service.from("member_permissions").insert({
      id: crypto.randomUUID(), circle_member_id: nearbyMember.data!.id,
      can_view_routine_status: true, can_view_medication_labels: false,
      can_view_notes: false, can_view_address: false, can_receive_alerts: true,
    }).select("id").single();
    memberPermissionId = permission.data!.id;

    // A real row to isolate against — without one, the cross-circle test
    // below would pass trivially on an empty table and prove nothing.
    await service.from("alerts").insert({
      id: crypto.randomUUID(), care_circle_id: circleId, source: "direct_help",
      status: "open", severity: "urgent",
    });
  });

  afterAll(async () => {
    await service.from("care_circles").delete().eq("id", circleId);
    for (const id of cleanupUserIds) {
      await service.from("profiles").delete().eq("id", id);
      await deleteTestAuthUser(id);
    }
  });

  it("nearby responder cannot view medication label via can_view_medication_labels flag", async () => {
    const nearbyClient = await signInAs(nearbyResponderId, `${nearbyResponderId}@example.invalid`);
    const { data } = await nearbyClient.from("member_permissions").select("can_view_medication_labels").eq("id", memberPermissionId).maybeSingle();
    expect(data?.can_view_medication_labels).toBe(false);
  });

  it("removed member cannot read the circle after removal", async () => {
    await service.from("circle_members").insert({
      id: crypto.randomUUID(), care_circle_id: circleId, user_id: outsiderId, relationship: "friend",
      responder_type: "family", is_nearby: false, priority: 2,
      preferred_channel: "email", membership_status: "removed",
    });
    const removedClient = await signInAs(outsiderId, `${outsiderId}@example.invalid`);
    const { data, error } = await removedClient.from("care_circles").select("*").eq("id", circleId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a user from another circle cannot read this circle's alerts", async () => {
    const otherUser = await createTestAuthUser(`other-${crypto.randomUUID()}@example.invalid`);
    cleanupUserIds.push(otherUser.id);
    await service.from("profiles").insert({
      id: otherUser.id, display_name: "Other", preferred_name: "Other", email: `${otherUser.id}@example.invalid`,
      timezone: "Europe/London", locale: "en-GB", accessibility_large_text: false,
      accessibility_reduced_motion: false, accessibility_high_contrast: false, onboarding_status: "complete",
    });
    const otherClient = await signInAs(otherUser.id, `${otherUser.id}@example.invalid`);
    const { data, error } = await otherClient.from("alerts").select("*").eq("care_circle_id", circleId);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Sanity check: the row genuinely exists and is visible to a member of
    // the circle — otherwise the assertion above would pass trivially on
    // an empty or universally-blocked table and prove nothing about RLS.
    const nearbyClient = await signInAs(nearbyResponderId, `${nearbyResponderId}@example.invalid`);
    const { data: visibleToMember } = await nearbyClient
      .from("alerts").select("*").eq("care_circle_id", circleId);
    expect(visibleToMember).not.toEqual([]);
  });

  it("authenticated clients cannot insert audit events directly (service-role only)", async () => {
    const nearbyClient = await signInAs(nearbyResponderId, `${nearbyResponderId}@example.invalid`);
    const { error } = await nearbyClient.from("audit_events").insert({
      id: crypto.randomUUID(), care_circle_id: circleId, actor_id: nearbyResponderId, actor_type: "user",
      action: "test", entity_type: "test", entity_id: "test",
    });
    // Must fail specifically because RLS has no insert policy for
    // authenticated/anon on audit_events (Task 3), not because of a
    // missing required field — id is supplied above so that's ruled out.
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run and verify**

```bash
bun run vitest run test/contracts/supabaseRls.contract.test.ts
```
Expected: all four PASS against the live project.

- [ ] **Step 4: Read the current `container.ts` and convert it to an env-branching factory**

Read `src/features/authentication/container.ts` in full first — do not guess its current export shape. Then restructure it to:

```typescript
// src/features/authentication/container.ts (illustrative shape — match against the file read above)
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseCareCircleRepository } from "@/infrastructure/supabase/repositories/SupabaseCareCircleRepository";
import { SupabaseInvitationRepository } from "@/infrastructure/supabase/repositories/SupabaseInvitationRepository";
import { SupabaseConsentRepository } from "@/infrastructure/supabase/repositories/SupabaseConsentRepository";
import { SupabaseAuditRepository } from "@/infrastructure/supabase/repositories/SupabaseAuditRepository";
import { SupabaseRoutineRepository } from "@/infrastructure/supabase/repositories/SupabaseRoutineRepository";
import { SupabaseOccurrenceRepository } from "@/infrastructure/supabase/repositories/SupabaseOccurrenceRepository";
import { SupabaseAlertRepository } from "@/infrastructure/supabase/repositories/SupabaseAlertRepository";
import { SupabaseCommunicationRepository } from "@/infrastructure/supabase/repositories/SupabaseCommunicationRepository";
// ... existing Local* imports and non-repository (clock, idGenerator, eventBus,
// notificationGateway, authProvider) construction stay exactly as they are —
// AuthProvider does not branch here; that is Phase 10 scope.

function buildRepositories() {
  if (process.env.DATA_ADAPTER === "supabase") {
    const client = createSupabaseServiceClient();
    return {
      profileRepository: new SupabaseProfileRepository(client),
      careCircleRepository: new SupabaseCareCircleRepository(client),
      invitationRepository: new SupabaseInvitationRepository(client),
      consentRepository: new SupabaseConsentRepository(client),
      auditRepository: new SupabaseAuditRepository(client),
      routineRepository: new SupabaseRoutineRepository(client),
      occurrenceRepository: new SupabaseOccurrenceRepository(client),
      alertRepository: new SupabaseAlertRepository(client),
      communicationRepository: new SupabaseCommunicationRepository(client),
    };
  }
  return {
    profileRepository: new LocalProfileRepository(store),
    careCircleRepository: new LocalCareCircleRepository(store),
    invitationRepository: new LocalInvitationRepository(store),
    consentRepository: new LocalConsentRepository(store),
    auditRepository: new LocalAuditRepository(store),
    routineRepository: new LocalRoutineRepository(store),
    occurrenceRepository: new LocalOccurrenceRepository(store),
    alertRepository: new LocalAlertRepository(store),
    communicationRepository: new LocalCommunicationRepository(store),
  };
}

export const container = {
  clock, idGenerator, eventBus, notificationGateway, authProvider,
  ...buildRepositories(),
};
```

Adjust this to match the exact current file's construction order, variable names (`store` vs whatever the local `KeyValueStore` instance is actually called), and any additional exported members the file already has — the goal is a minimal, additive change: existing behavior with `DATA_ADAPTER` unset or `local` must be byte-for-byte identical to today.

- [ ] **Step 5: Run the full existing test suite to confirm no regression**

```bash
bun test
```
Expected: PASS, identical results to before this task (default `DATA_ADAPTER` is unset → local adapters, unchanged behavior).

- [ ] **Step 6: Document in `README.md`**

Add a section (find the right existing heading — likely near any existing "Local development" or "Testing" section) covering: what `DATA_ADAPTER=local|supabase` does, that `supabase` mode requires `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, how to run migrations (`supabase db push --linked`), and how to run the Supabase contract/RLS tests (`bun run vitest run test/contracts/supabaseRepositories.contract.test.ts test/contracts/supabaseRls.contract.test.ts`) — noting these hit a real (non-production) hosted project and require those env vars to be set locally.

- [ ] **Step 7: Commit**

```bash
git add test/infrastructure/supabase/testAuthUsers.ts test/contracts/supabaseRls.contract.test.ts \
  src/features/authentication/container.ts README.md
git commit -m "feat: add supabase adapters behind domain ports"
```

This is the Phase 9 commit message specified in `Implementation.md` (line 1274) — use it verbatim for this final task since it's the one that actually completes the phase's wiring.

---

## Self-Review Notes

- **Spec coverage:** Task 2–5 cover every entity in Implementation.md §8.1; Task 6 covers the Phase 9 RLS principles (lines 1256–1264) and required DB constraints (lines 1248–1255: unique occurrence ✅ Task 4, one active claim ✅ Task 5's `claim_alert`, FK integrity ✅ throughout, enumerated states via CHECK ✅ throughout, idempotency-key uniqueness ✅ Task 5, server-controlled timestamps ✅ `set_updated_at()` trigger + `claim_alert`'s `security definer`); Task 11 covers the four §13.3 negative-test cases and the "no UI imports Supabase directly" / "adapter passes same contract suite" acceptance criteria.
- **Not covered by this plan, deliberately out of scope for Phase 9:** Supabase Realtime subscription design and server-side scheduled occurrence/escalation processing design are named in Phase 9's action list (lines 1241–1242) but produce no testable code by themselves (they're consumed in Phase 10). If you want them captured now rather than deferred, add a Task 12 writing a design note (`docs/supabase-realtime-and-scheduling-design.md`) — flagged here rather than silently dropped.
- **`LocalAuthProvider` is not touched.** `profiles.id` is a plain `text` primary key with no FK to `auth.users` in this phase (see Architecture) — linking it is Phase 10's concern. No product code path creates real Supabase Auth users; only Task 11's RLS tests do, purely to obtain a real signed-in JWT for policy testing.
- **Pre-flight ruling (schema types):** the draft plan originally typed every id/FK column `uuid` with `profiles.id references auth.users(id)`. Caught before Task 1 dispatch: the shared `test/contracts/repositoryContract.ts` + `test/builders/entities.ts` fixtures (read in full during pre-flight) use plain non-UUID literal ids (`"c-1"`, `"user-1"`, `"routine-1"`, ...) and are reused unmodified for both Local and Supabase adapters per Phase 9's acceptance criteria. `uuid` columns would reject every one of them outright. Ruling: switched all id/FK columns to `text`, dropped the `auth.users` FK on `profiles.id`, and added `::text` casts to every RLS policy comparing against `auth.uid()`. Task 7 additionally seeds the closed set of literal parent-row ids the shared suite references (enumerated by reading both files in full) via `seedFixedContractParents`, once, so FK integrity (still enforced, still spec-required) doesn't reject the shared fixtures. Cost if wrong: caught immediately as `23503`/type-mismatch errors on the first `db push` or first contract-test run — not a silent defect.
