/**
 * Repository ports (Implementation.md §11.1). Local and Supabase
 * implementations must satisfy the same contract tests
 * (see test/contracts/repositoryContract.ts).
 */
import type { UserProfile } from "../../domain/entities/profile";
import type { CareCircle, CircleMember, MemberPermission } from "../../domain/entities/careCircle";
import type { Invitation } from "../../domain/entities/invitation";
import type { EscalationPolicy, Routine, RoutineOccurrence } from "../../domain/entities/routine";
import type { Alert, AlertRecipient, CommunicationEvent } from "../../domain/entities/alert";
import type {
  AuditEvent,
  ConsentRecord,
  NotificationPreference,
} from "../../domain/entities/consent";

export interface ProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<void>;
}

export interface CareCircleRepository {
  findById(id: string): Promise<CareCircle | null>;
  findByUserId(userId: string): Promise<CareCircle[]>;
  findAllActive(): Promise<CareCircle[]>;
  save(circle: CareCircle): Promise<void>;
  findMembers(careCircleId: string): Promise<CircleMember[]>;
  findMemberById(id: string): Promise<CircleMember | null>;
  findMemberByUserAndCircle(userId: string, careCircleId: string): Promise<CircleMember | null>;
  saveMember(member: CircleMember): Promise<void>;
  findPermission(circleMemberId: string): Promise<MemberPermission | null>;
  savePermission(permission: MemberPermission): Promise<void>;
}

export interface InvitationRepository {
  findById(id: string): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findByCareCircle(careCircleId: string): Promise<Invitation[]>;
  save(invitation: Invitation): Promise<void>;
}

export interface RoutineRepository {
  findById(id: string): Promise<Routine | null>;
  findByCareCircle(careCircleId: string): Promise<Routine[]>;
  save(routine: Routine): Promise<void>;
  findEscalationPolicy(routineId: string): Promise<EscalationPolicy | null>;
  saveEscalationPolicy(policy: EscalationPolicy): Promise<void>;
}

export interface OccurrenceRepository {
  findById(id: string): Promise<RoutineOccurrence | null>;
  findByRoutineAndScheduledForUtc(
    routineId: string,
    scheduledForUtc: string,
  ): Promise<RoutineOccurrence | null>;
  findByRoutine(routineId: string): Promise<RoutineOccurrence[]>;
  findDue(nowUtc: string): Promise<RoutineOccurrence[]>;
  save(occurrence: RoutineOccurrence): Promise<void>;
}

export interface AlertRepository {
  findById(id: string): Promise<Alert | null>;
  findByCareCircle(careCircleId: string): Promise<Alert[]>;
  findOpenByCareCircle(careCircleId: string): Promise<Alert[]>;
  save(alert: Alert): Promise<void>;
  /**
   * Atomically claims an alert on behalf of a circle member: succeeds only if
   * the alert has no current claim. Returns false (never throws) when the
   * claim loses a race — the caller shows a friendly "X is handling it"
   * message rather than an error (Implementation.md §9.3).
   */
  tryClaim(
    alertId: string,
    claimedBy: string,
    claimedAt: string,
    claimExpiresAt: string,
  ): Promise<boolean>;
  findRecipients(alertId: string): Promise<AlertRecipient[]>;
  saveRecipient(recipient: AlertRecipient): Promise<void>;
}

export interface CommunicationRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<CommunicationEvent | null>;
  save(event: CommunicationEvent): Promise<void>;
}

export interface ConsentRepository {
  findByCareCircle(careCircleId: string): Promise<ConsentRecord[]>;
  save(record: ConsentRecord): Promise<void>;
  findNotificationPreferences(
    userId: string,
    careCircleId: string,
  ): Promise<NotificationPreference[]>;
  saveNotificationPreference(preference: NotificationPreference): Promise<void>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  findByCareCircle(careCircleId: string): Promise<AuditEvent[]>;
}
