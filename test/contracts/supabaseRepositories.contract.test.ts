import { beforeAll } from "vitest";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";
import { resetVolatileContractRows, seedFixedContractParents } from "./supabaseFixtures";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseInvitationRepository } from "@/infrastructure/supabase/repositories/SupabaseInvitationRepository";
import {
  runProfileRepositoryContract,
  runInvitationRepositoryContract,
} from "./repositoryContract";

const client = createSupabaseServiceClient();

beforeAll(async () => {
  await resetVolatileContractRows(client);
  await seedFixedContractParents(client);
});

runProfileRepositoryContract(() => new SupabaseProfileRepository(client));
runInvitationRepositoryContract(() => new SupabaseInvitationRepository(client));
