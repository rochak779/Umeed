/**
 * Composition root for the local-first adapters (Implementation.md §11).
 * Everything here is a singleton wired to the browser's localStorage — this
 * is the one file allowed to know about concrete Local* implementations.
 * Supabase adapters are wired up the same way, behind the same ports, when
 * `DATA_ADAPTER=supabase`: repositories (Phase 9) and `authProvider` via
 * `SupabaseAuthProvider` (Phase 10) both branch on it here, without any
 * feature code changing.
 */
import { BrowserLocalStorageStore } from "../../infrastructure/local/KeyValueStore";
import { SystemClock } from "../../shared/time/Clock";
import { UuidIdGenerator } from "../../shared/id/IdGenerator";
import { LocalAuthProvider } from "../../infrastructure/local/auth/LocalAuthProvider";
import { getSupabaseAuthClient } from "../../infrastructure/supabase/authClient";
import { SupabaseAuthProvider } from "../../infrastructure/supabase/auth/SupabaseAuthProvider";
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
import { MockNotificationGateway } from "../../infrastructure/mock-communications/MockNotificationGateway";
import { createSupabaseServiceClient } from "../../infrastructure/supabase/client";
import { SupabaseProfileRepository } from "../../infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseCareCircleRepository } from "../../infrastructure/supabase/repositories/SupabaseCareCircleRepository";
import { SupabaseInvitationRepository } from "../../infrastructure/supabase/repositories/SupabaseInvitationRepository";
import { SupabaseConsentRepository } from "../../infrastructure/supabase/repositories/SupabaseConsentRepository";
import { SupabaseAuditRepository } from "../../infrastructure/supabase/repositories/SupabaseAuditRepository";
import { SupabaseRoutineRepository } from "../../infrastructure/supabase/repositories/SupabaseRoutineRepository";
import { SupabaseOccurrenceRepository } from "../../infrastructure/supabase/repositories/SupabaseOccurrenceRepository";
import { SupabaseAlertRepository } from "../../infrastructure/supabase/repositories/SupabaseAlertRepository";
import { SupabaseCommunicationRepository } from "../../infrastructure/supabase/repositories/SupabaseCommunicationRepository";

const store = new BrowserLocalStorageStore();

/**
 * Repository set only branches on `DATA_ADAPTER` — everything else (clock,
 * idGenerator, eventBus, notificationGateway) stays on the local/mock
 * adapters regardless. `authProvider` also branches on `DATA_ADAPTER`, but
 * separately, in `buildAuthProvider()` below (Phase 10: `SupabaseAuthProvider`
 * when `DATA_ADAPTER=supabase`, `LocalAuthProvider` otherwise).
 */
function buildRepositories() {
  if (process.env["DATA_ADAPTER"] === "supabase") {
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

function buildAuthProvider() {
  if (process.env["DATA_ADAPTER"] === "supabase") {
    return new SupabaseAuthProvider(getSupabaseAuthClient);
  }
  return new LocalAuthProvider(store, new SystemClock());
}

export const container = {
  clock: new SystemClock(),
  idGenerator: new UuidIdGenerator(),
  eventBus: new LocalEventBus(),
  notificationGateway: new MockNotificationGateway(new SystemClock(), new UuidIdGenerator()),
  authProvider: buildAuthProvider(),
  ...buildRepositories(),
};
