import { InMemoryKeyValueStore } from "../../src/infrastructure/local/KeyValueStore";
import { LocalProfileRepository } from "../../src/infrastructure/local/repositories/LocalProfileRepository";
import { LocalCareCircleRepository } from "../../src/infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "../../src/infrastructure/local/repositories/LocalInvitationRepository";
import { LocalRoutineRepository } from "../../src/infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../src/infrastructure/local/repositories/LocalOccurrenceRepository";
import { LocalAlertRepository } from "../../src/infrastructure/local/repositories/LocalAlertRepository";
import { LocalCommunicationRepository } from "../../src/infrastructure/local/repositories/LocalCommunicationRepository";
import { LocalConsentRepository } from "../../src/infrastructure/local/repositories/LocalConsentRepository";
import { LocalAuditRepository } from "../../src/infrastructure/local/repositories/LocalAuditRepository";
import {
  runAlertRepositoryContract,
  runAuditRepositoryContract,
  runCareCircleRepositoryContract,
  runCommunicationRepositoryContract,
  runConsentRepositoryContract,
  runInvitationRepositoryContract,
  runOccurrenceRepositoryContract,
  runProfileRepositoryContract,
  runRoutineRepositoryContract,
} from "./repositoryContract";

// A fresh InMemoryKeyValueStore is constructed per factory call so tests
// don't leak state between each other. BrowserLocalStorageStore is not used
// here: vitest.config.ts runs in a node environment and that store is a
// no-op without a `window` global.
runProfileRepositoryContract(() => new LocalProfileRepository(new InMemoryKeyValueStore()));
runCareCircleRepositoryContract(() => new LocalCareCircleRepository(new InMemoryKeyValueStore()));
runInvitationRepositoryContract(() => new LocalInvitationRepository(new InMemoryKeyValueStore()));
runRoutineRepositoryContract(() => new LocalRoutineRepository(new InMemoryKeyValueStore()));
runOccurrenceRepositoryContract(() => new LocalOccurrenceRepository(new InMemoryKeyValueStore()));
runAlertRepositoryContract(() => new LocalAlertRepository(new InMemoryKeyValueStore()));
runCommunicationRepositoryContract(
  () => new LocalCommunicationRepository(new InMemoryKeyValueStore()),
);
runConsentRepositoryContract(() => new LocalConsentRepository(new InMemoryKeyValueStore()));
runAuditRepositoryContract(() => new LocalAuditRepository(new InMemoryKeyValueStore()));
