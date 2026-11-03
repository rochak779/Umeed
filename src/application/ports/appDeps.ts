import type { EventBus, NotificationGateway } from "./infra";
import type {
  AlertRepository,
  AuditRepository,
  CareCircleRepository,
  CommunicationRepository,
  ConsentRepository,
  InvitationRepository,
  OccurrenceRepository,
  ProfileRepository,
  RoutineRepository,
} from "./repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";

/**
 * Everything a use-case can depend on, minus auth. Built from service-role
 * Supabase repositories on the server (src/server/serverDeps.ts) or from the
 * localStorage adapters in local mode (container.ts).
 */
export type AppDeps = {
  clock: Clock;
  idGenerator: IdGenerator;
  eventBus: EventBus;
  notificationGateway: NotificationGateway;
  profileRepository: ProfileRepository;
  careCircleRepository: CareCircleRepository;
  invitationRepository: InvitationRepository;
  consentRepository: ConsentRepository;
  auditRepository: AuditRepository;
  routineRepository: RoutineRepository;
  occurrenceRepository: OccurrenceRepository;
  alertRepository: AlertRepository;
  communicationRepository: CommunicationRepository;
};
