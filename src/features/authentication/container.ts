/**
 * Composition root for the local-first adapters (Implementation.md §11).
 * Everything here is a singleton wired to the browser's localStorage — this
 * is the one file allowed to know about concrete Local* implementations.
 * Supabase adapters will be wired up the same way, behind the same ports,
 * in Phase 9/10, without any feature code changing.
 */
import { BrowserLocalStorageStore } from "../../infrastructure/local/KeyValueStore";
import { SystemClock } from "../../shared/time/Clock";
import { UuidIdGenerator } from "../../shared/id/IdGenerator";
import { LocalAuthProvider } from "../../infrastructure/local/auth/LocalAuthProvider";
import { LocalProfileRepository } from "../../infrastructure/local/repositories/LocalProfileRepository";
import { LocalCareCircleRepository } from "../../infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "../../infrastructure/local/repositories/LocalInvitationRepository";
import { LocalConsentRepository } from "../../infrastructure/local/repositories/LocalConsentRepository";
import { LocalAuditRepository } from "../../infrastructure/local/repositories/LocalAuditRepository";
import { LocalRoutineRepository } from "../../infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../infrastructure/local/repositories/LocalOccurrenceRepository";
import { LocalAlertRepository } from "../../infrastructure/local/repositories/LocalAlertRepository";
import { LocalCommunicationRepository } from "../../infrastructure/local/repositories/LocalCommunicationRepository";
import { LocalEventBus } from "../../infrastructure/local/LocalEventBus";

const store = new BrowserLocalStorageStore();

export const container = {
  clock: new SystemClock(),
  idGenerator: new UuidIdGenerator(),
  eventBus: new LocalEventBus(),
  authProvider: new LocalAuthProvider(store, new SystemClock()),
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
