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
});

runProfileRepositoryContract(() => new SupabaseProfileRepository(client));
runInvitationRepositoryContract(() => new SupabaseInvitationRepository(client));
runCareCircleRepositoryContract(() => new SupabaseCareCircleRepository(client));
runConsentRepositoryContract(() => new SupabaseConsentRepository(client));
runRoutineRepositoryContract(() => new SupabaseRoutineRepository(client));
runOccurrenceRepositoryContract(() => new SupabaseOccurrenceRepository(client));
