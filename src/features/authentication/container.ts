/**
 * Composition root for the local-first adapters (Implementation.md §11).
 * Everything here is a singleton wired to the browser's localStorage — this
 * is the one file allowed to know about concrete Local* implementations.
 * In Supabase mode only `authProvider` switches (to `SupabaseAuthProvider`,
 * anon key + the user's own session); repositories live behind server
 * functions instead — see `repository()` below.
 */
import { isSupabaseMode } from "../../shared/config";
import type { AppDeps } from "../../application/ports/appDeps";
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

const store = new BrowserLocalStorageStore();

type Repositories = Omit<AppDeps, "clock" | "idGenerator" | "eventBus" | "notificationGateway">;

function buildLocalRepositories(): Repositories {
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

/**
 * In Supabase mode the container holds no repositories: this module ships to
 * the browser, and the only Supabase repositories that exist are built on the
 * service-role client, which must stay on the server. Data access in that
 * mode goes through server functions (src/server/serverDeps.ts builds the
 * repositories there). Local mode keeps the localStorage adapters.
 */
const localRepositories: Repositories | null = isSupabaseMode() ? null : buildLocalRepositories();

function repositoriesOrThrow(): Repositories {
  if (!localRepositories) {
    throw new Error(
      "Local repositories are not available in Supabase mode — read and write through server functions instead.",
    );
  }
  return localRepositories;
}

function repository<K extends keyof Repositories>(name: K): Repositories[K] {
  if (!localRepositories) {
    throw new Error(
      `container.${name} is not available in Supabase mode — read and write through server functions instead.`,
    );
  }
  return localRepositories[name];
}

function buildAuthProvider() {
  if (isSupabaseMode()) {
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
  get profileRepository() {
    return repository("profileRepository");
  },
  get careCircleRepository() {
    return repository("careCircleRepository");
  },
  get invitationRepository() {
    return repository("invitationRepository");
  },
  get consentRepository() {
    return repository("consentRepository");
  },
  get auditRepository() {
    return repository("auditRepository");
  },
  get routineRepository() {
    return repository("routineRepository");
  },
  get occurrenceRepository() {
    return repository("occurrenceRepository");
  },
  get alertRepository() {
    return repository("alertRepository");
  },
  get communicationRepository() {
    return repository("communicationRepository");
  },
};

/** The local-mode equivalent of the server's `buildServerDeps()`. */
export function localDeps(): AppDeps {
  return {
    clock: container.clock,
    idGenerator: container.idGenerator,
    eventBus: container.eventBus,
    notificationGateway: container.notificationGateway,
    ...repositoriesOrThrow(),
  };
}

/** The signed-in local-mode user — the local equivalent of `currentActor()`. */
export async function localActor(): Promise<{ userId: string; email: string }> {
  const session = await container.authProvider.getSession();
  if (!session) throw new Error("unauthenticated");
  return { userId: session.userId, email: session.email };
}

export async function localUserId(): Promise<string> {
  return (await localActor()).userId;
}
