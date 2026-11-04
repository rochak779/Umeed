/**
 * Server-only: builds use-case dependencies on service-role Supabase
 * repositories. Only server-function handlers may call this — the service
 * role bypasses RLS, so the caller must already have resolved the actor
 * (src/server/actor.ts) and checked membership.
 */
import type { AppDeps } from "@/application/ports/appDeps";
import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";
import { SupabaseProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseProfileRepository";
import { SupabaseCareCircleRepository } from "@/infrastructure/supabase/repositories/SupabaseCareCircleRepository";
import { SupabaseInvitationRepository } from "@/infrastructure/supabase/repositories/SupabaseInvitationRepository";
import { SupabaseConsentRepository } from "@/infrastructure/supabase/repositories/SupabaseConsentRepository";
import { SupabaseAuditRepository } from "@/infrastructure/supabase/repositories/SupabaseAuditRepository";
import { SupabaseRoutineRepository } from "@/infrastructure/supabase/repositories/SupabaseRoutineRepository";
import { SupabaseOccurrenceRepository } from "@/infrastructure/supabase/repositories/SupabaseOccurrenceRepository";
import { SupabaseAlertRepository } from "@/infrastructure/supabase/repositories/SupabaseAlertRepository";
import { SupabaseCommunicationRepository } from "@/infrastructure/supabase/repositories/SupabaseCommunicationRepository";
import { LocalEventBus } from "@/infrastructure/local/LocalEventBus";
import { MockNotificationGateway } from "@/infrastructure/mock-communications/MockNotificationGateway";
import { SystemClock } from "@/shared/time/Clock";
import { UuidIdGenerator } from "@/shared/id/IdGenerator";

export type { AppDeps };

export function buildServerDeps(): AppDeps {
  const client = createSupabaseServiceClient();
  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  return {
    clock,
    idGenerator,
    eventBus: new LocalEventBus(),
    notificationGateway: new MockNotificationGateway(clock, idGenerator),
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
