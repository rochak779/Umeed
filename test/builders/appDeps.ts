import type { AppDeps } from "@/application/ports/appDeps";
import { InMemoryKeyValueStore } from "@/infrastructure/local/KeyValueStore";
import { LocalEventBus } from "@/infrastructure/local/LocalEventBus";
import { MockNotificationGateway } from "@/infrastructure/mock-communications/MockNotificationGateway";
import { LocalProfileRepository } from "@/infrastructure/local/repositories/LocalProfileRepository";
import { LocalCareCircleRepository } from "@/infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalInvitationRepository } from "@/infrastructure/local/repositories/LocalInvitationRepository";
import { LocalConsentRepository } from "@/infrastructure/local/repositories/LocalConsentRepository";
import { LocalAuditRepository } from "@/infrastructure/local/repositories/LocalAuditRepository";
import { LocalRoutineRepository } from "@/infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "@/infrastructure/local/repositories/LocalOccurrenceRepository";
import { LocalAlertRepository } from "@/infrastructure/local/repositories/LocalAlertRepository";
import { LocalCommunicationRepository } from "@/infrastructure/local/repositories/LocalCommunicationRepository";
import { FakeClock } from "@/shared/time/Clock";
import { SequentialIdGenerator } from "@/shared/id/IdGenerator";

/** A full AppDeps on fresh in-memory local adapters, for server-function tests. */
export function buildInMemoryAppDeps(now = new Date("2026-01-05T09:00:00.000Z")): AppDeps {
  const store = new InMemoryKeyValueStore();
  const clock = new FakeClock(now);
  const idGenerator = new SequentialIdGenerator("id");
  return {
    clock,
    idGenerator,
    eventBus: new LocalEventBus(),
    notificationGateway: new MockNotificationGateway(clock, idGenerator),
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
