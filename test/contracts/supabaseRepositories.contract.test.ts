import { afterEach, beforeAll } from "vitest";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";
import { resetVolatileContractRows, seedFixedContractParents } from "./supabaseFixtures";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseInvitationRepository } from "@/infrastructure/supabase/repositories/SupabaseInvitationRepository";
import {
  runProfileRepositoryContract,
  runInvitationRepositoryContract,
} from "./repositoryContract";
import { SupabaseCareCircleRepository } from "@/infrastructure/supabase/repositories/SupabaseCareCircleRepository";
import { SupabaseConsentRepository } from "@/infrastructure/supabase/repositories/SupabaseConsentRepository";
import {
  runCareCircleRepositoryContract,
  runConsentRepositoryContract,
} from "./repositoryContract";
import { SupabaseRoutineRepository } from "@/infrastructure/supabase/repositories/SupabaseRoutineRepository";
import { SupabaseOccurrenceRepository } from "@/infrastructure/supabase/repositories/SupabaseOccurrenceRepository";
import {
  runRoutineRepositoryContract,
  runOccurrenceRepositoryContract,
} from "./repositoryContract";
import { SupabaseAlertRepository } from "@/infrastructure/supabase/repositories/SupabaseAlertRepository";
import { SupabaseCommunicationRepository } from "@/infrastructure/supabase/repositories/SupabaseCommunicationRepository";
import { SupabaseAuditRepository } from "@/infrastructure/supabase/repositories/SupabaseAuditRepository";
import {
  runAlertRepositoryContract,
  runCommunicationRepositoryContract,
  runAuditRepositoryContract,
} from "./repositoryContract";

const client = createSupabaseServiceClient();

beforeAll(async () => {
  await resetVolatileContractRows(client);
  await seedFixedContractParents(client);
});

/**
 * Unlike the Local adapter's `makeRepository()` — which hands each `it()`
 * a brand-new, empty `InMemoryKeyValueStore` — Supabase's `occurrences`
 * table persists between test cases within a single run. Several of
 * runOccurrenceRepositoryContract's cases reuse the literal ids "o-1"/"o-2"
 * with buildOccurrence()'s default (routineId, scheduledForUtc), and
 * `occurrences_routine_scheduled_idx` is a real unique index: a later case
 * inserting a *different* literal id at the same (routineId,
 * scheduledForUtc) an earlier case already claimed would otherwise hit a
 * genuine ConflictError that has nothing to do with what that case is
 * testing. Deleting this contract's own literal occurrence ids after every
 * test (any Supabase-owned test, not just occurrence ones — harmless when
 * the ids don't exist) restores the "fresh store per test" isolation the
 * shared contract assumes.
 */
afterEach(async () => {
  const { error } = await client
    .from("occurrences")
    .delete()
    .in("id", ["o-1", "o-2", "o-due", "o-future", "o-resolved"]);
  if (error) throw error;

  // Same reasoning as above, for AlertRepository contract's literal ids:
  // `alerts.save` is an upsert, so reusing "a-1"/"a-2" across cases is
  // harmless, but "findOpenByCareCircle excludes ..." leaves "a-open" and
  // "a-resolved" permanently attached to care circle "c-1" — without
  // cleanup, the very next case ("isolates alerts between care circles",
  // which also uses care circle "c-1") would see those leftover rows and
  // fail a `findByCareCircle("c-1")` equality assertion that has nothing
  // to do with what it's testing.
  const { error: alertsError } = await client
    .from("alerts")
    .delete()
    .in("id", ["a-1", "a-2", "a-open", "a-resolved"]);
  if (alertsError) throw alertsError;

  // AuditRepository's `append` is a plain append-only INSERT (never an
  // upsert — see Task 10 Step 4), and its contract's own cases reuse the
  // literal ids "a-1"/"a-2" across cases ("appends and lists events",
  // "isolates audit events between care circles", "append never lets a
  // caller overwrite ..."). Without per-case cleanup, the second case to
  // touch either id would hit a genuine ConflictError from the first
  // case's leftover row, unrelated to what that case is testing.
  const { error: auditError } = await client.from("audit_events").delete().in("id", ["a-1", "a-2"]);
  if (auditError) throw auditError;
});

runProfileRepositoryContract(() => new SupabaseProfileRepository(client));
runInvitationRepositoryContract(() => new SupabaseInvitationRepository(client));
runCareCircleRepositoryContract(() => new SupabaseCareCircleRepository(client));
runConsentRepositoryContract(() => new SupabaseConsentRepository(client));
runRoutineRepositoryContract(() => new SupabaseRoutineRepository(client));
runOccurrenceRepositoryContract(() => new SupabaseOccurrenceRepository(client));
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
