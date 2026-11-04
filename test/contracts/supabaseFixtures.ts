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
  const { error: profilesError } = await client
    .from("profiles")
    .upsert([
      profileRow("user-1"),
      profileRow("user-2"),
      profileRow("coordinator-1"),
      profileRow("older-adult-1"),
    ]);
  if (profilesError) throw profilesError;

  const { error: circlesError } = await client
    .from("care_circles")
    .upsert([circleRow("circle-1"), circleRow("c-1"), circleRow("c-2")]);
  if (circlesError) throw circlesError;

  const { error: routinesError } = await client
    .from("routines")
    .upsert([routineRow("routine-1"), routineRow("r-1"), routineRow("r-2")]);
  if (routinesError) throw routinesError;

  const { error: membersError } = await client.from("circle_members").upsert([
    // Deliberately not user-1/user-2: CareCircleRepository's
    // findByUserId contract (Task 8) asserts the exact set of circles
    // those two users actively belong to, so this parent-fixture
    // membership must not leak circle-1 into either user's results.
    memberRow("member-1", "circle-1", "coordinator-1"),
    memberRow("m-1", "c-1", "user-1"),
    memberRow("m-2", "c-2", "user-2"),
  ]);
  if (membersError) throw membersError;

  const { error: occurrenceError } = await client.from("occurrences").upsert([
    {
      id: "occ-1",
      routine_id: "routine-1",
      // Deliberately not 2026-01-05T09:00 / 2026-01-06T09:00 on routine-1:
      // buildOccurrence()'s and the OccurrenceRepository contract's own
      // test cases use those exact (routineId, scheduledForUtc) pairs, and
      // occurrences_routine_scheduled_idx is a real unique index — colliding
      // here would make an unrelated fixture row trip ConflictError inside
      // the contract's own "round-trips"/"findDue" cases.
      scheduled_for_utc: "2025-12-01T09:00:00.000Z",
      scheduled_local_date: "2025-12-01",
      // "resolved" (not "scheduled"): OccurrenceRepository#findDue has no
      // routine/circle scoping — it's a genuinely global "every unresolved
      // occurrence" query — so a persistent fixture row here would leak
      // into the OccurrenceRepository contract's findDue assertions
      // otherwise.
      status: "resolved",
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

/**
 * Deletes the non-parent, test-owned rows each run*RepositoryContract case
 * creates with a literal id (e.g. "p-1", "i-1"), so the suite is safe to
 * re-run against the live project. Unlike the Local adapter's in-memory
 * store — which starts empty for every `makeRepository()` call — the
 * Supabase tables persist between runs, and several contract cases assert
 * exact equality on `updatedAt`/`createdAt`. `profiles`, `care_circles`,
 * `routines`, etc. all have a `before update` trigger that stamps
 * `updated_at = now()` on the server, so once a row from a previous run
 * already exists, the *next* run's "save" becomes an UPDATE instead of an
 * INSERT and the trigger overwrites the literal timestamp the test
 * expects. Deleting these rows first makes every run start from the same
 * "never saved" state the assertions assume.
 *
 * Extend this (not `seedFixedContractParents`) in Tasks 8-10 with any
 * further literal ids their contracts create directly (not the fixed
 * parent ids already listed in `seedFixedContractParents`).
 */
export async function resetVolatileContractRows(client: SupabaseClient): Promise<void> {
  await clearGeneratedFixtureRows(client);

  const { error: profilesError } = await client.from("profiles").delete().in("id", ["p-1"]);
  if (profilesError) throw profilesError;

  const { error: invitationsError } = await client
    .from("invitations")
    .delete()
    .in("id", ["i-1", "i-2"]);
  if (invitationsError) throw invitationsError;
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
    // Disabled so the every-minute umeed-poll-due-work job ignores these
    // test-only routines instead of regenerating occurrences and alerts
    // for them between (and during) contract runs.
    enabled: false,
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

const FIXTURE_CIRCLE_IDS = ["circle-1", "c-1", "c-2"];
const FIXTURE_ROUTINE_IDS = ["routine-1", "r-1", "r-2"];
const SEEDED_ALERT_IDS = ["alert-1"];
const SEEDED_OCCURRENCE_IDS = ["occ-1"];

/**
 * The fixture routines are real, enabled, every-day routines in active
 * circles, so the due-work poll (the umeed-poll-due-work function and its
 * contract test) keeps generating occurrences, missed-routine alerts,
 * communication events and audit events for them under ids no contract
 * case knows. Those rows pile up across runs and break exact-equality
 * assertions on the fixture circles. Clear everything hanging off the
 * fixture circles/routines except the seeded parents, children first
 * (communication_events and alerts.occurrence_id have no cascade).
 */
async function clearGeneratedFixtureRows(client: SupabaseClient): Promise<void> {
  const { data: alerts, error: alertsReadError } = await client
    .from("alerts")
    .select("id")
    .in("care_circle_id", FIXTURE_CIRCLE_IDS);
  if (alertsReadError) throw alertsReadError;
  const alertIds = (alerts ?? [])
    .map((a: { id: string }) => a.id)
    .filter((id) => !SEEDED_ALERT_IDS.includes(id));

  const { data: occurrences, error: occurrencesReadError } = await client
    .from("occurrences")
    .select("id")
    .in("routine_id", FIXTURE_ROUTINE_IDS);
  if (occurrencesReadError) throw occurrencesReadError;
  const occurrenceIds = (occurrences ?? [])
    .map((o: { id: string }) => o.id)
    .filter((id) => !SEEDED_OCCURRENCE_IDS.includes(id));

  for (const chunk of chunks(alertIds)) {
    const { error } = await client.from("communication_events").delete().in("alert_id", chunk);
    if (error) throw error;
  }
  for (const chunk of chunks(occurrenceIds)) {
    const { error } = await client.from("communication_events").delete().in("occurrence_id", chunk);
    if (error) throw error;
  }
  for (const chunk of chunks(alertIds)) {
    const { error } = await client.from("alerts").delete().in("id", chunk);
    if (error) throw error;
  }
  for (const chunk of chunks(occurrenceIds)) {
    // Alerts can reference these occurrences from outside the fixture
    // circles, or be raised by a concurrently running due-work poll after
    // the deletes above — clear those right before the occurrences go.
    const { data: linked, error: linkedError } = await client
      .from("alerts")
      .select("id")
      .in("occurrence_id", chunk)
      .not("id", "in", `(${SEEDED_ALERT_IDS.join(",")})`);
    if (linkedError) throw linkedError;
    const linkedIds = (linked ?? []).map((a: { id: string }) => a.id);
    if (linkedIds.length > 0) {
      const { error: commsError } = await client
        .from("communication_events")
        .delete()
        .in("alert_id", linkedIds);
      if (commsError) throw commsError;
      const { error: alertsError } = await client.from("alerts").delete().in("id", linkedIds);
      if (alertsError) throw alertsError;
    }
    const { error } = await client.from("occurrences").delete().in("id", chunk);
    if (error) throw error;
  }
  const { error: auditError } = await client
    .from("audit_events")
    .delete()
    .in("care_circle_id", FIXTURE_CIRCLE_IDS);
  if (auditError) throw auditError;
}

/** Keeps `in (...)` filters well under PostgREST's URL length limit. */
function chunks<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
