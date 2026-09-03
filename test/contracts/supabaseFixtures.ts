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

  const { error: membersError } = await client
    .from("circle_members")
    .upsert([
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
