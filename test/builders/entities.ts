/**
 * Entity builders for tests (Implementation.md §11: "Recommended logical
 * structure ... test/builders/"). Every field has a sensible default so
 * tests only specify what they care about.
 */
import {
  defaultPermissionsFor,
  type CareCircle,
  type CircleMember,
  type MemberPermission,
} from "../../src/domain/entities/careCircle";
import type { UserProfile } from "../../src/domain/entities/profile";
import type {
  EscalationPolicy,
  Routine,
  RoutineOccurrence,
} from "../../src/domain/entities/routine";
import type { Alert } from "../../src/domain/entities/alert";
import type { Invitation } from "../../src/domain/entities/invitation";

const NOW = "2026-01-01T00:00:00.000Z";

export function buildUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    displayName: "Test User",
    preferredName: "Test",
    phone: null,
    address: null,
    email: "test@example.com",
    timezone: "Europe/London",
    locale: "en-GB",
    accessibilityPreferences: { largeText: false, reducedMotion: false, highContrast: false },
    onboardingStatus: "not_started",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildCareCircle(overrides: Partial<CareCircle> = {}): CareCircle {
  return {
    id: "circle-1",
    name: "Test circle",
    olderAdultId: "older-adult-1",
    coordinatorId: "coordinator-1",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildCircleMember(overrides: Partial<CircleMember> = {}): CircleMember {
  return {
    id: "member-1",
    careCircleId: "circle-1",
    userId: "user-1",
    relationship: "family",
    responderType: "family",
    isNearby: false,
    priority: 0,
    availability: null,
    preferredChannel: "in_app",
    membershipStatus: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildMemberPermission(
  circleMemberId: string,
  responderType: CircleMember["responderType"],
  overrides: Partial<MemberPermission> = {},
): MemberPermission {
  return {
    id: `perm-${circleMemberId}`,
    circleMemberId,
    ...defaultPermissionsFor(responderType),
    grantedAt: NOW,
    revokedAt: null,
    ...overrides,
  };
}

export function buildRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "routine-1",
    careCircleId: "circle-1",
    olderAdultId: "older-adult-1",
    type: "medication",
    title: "Morning check-in and tablets",
    description: null,
    timezone: "Europe/London",
    localTime: "09:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: "2026-01-01",
    endDate: null,
    gracePeriodMinutes: 30,
    visibility: "family_and_nearby",
    enabled: true,
    notificationChannels: ["in_app"],
    createdBy: "coordinator-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildEscalationPolicy(overrides: Partial<EscalationPolicy> = {}): EscalationPolicy {
  return {
    id: "policy-1",
    routineId: "routine-1",
    name: "Default",
    enabled: true,
    steps: [
      {
        order: 1,
        delayMinutes: 0,
        recipientType: "older_adult",
        recipientId: null,
        channel: "in_app",
        responseWindowMinutes: 10,
        fallbackBehaviour: "advance_to_next_step",
      },
      {
        order: 2,
        delayMinutes: 10,
        recipientType: "older_adult",
        recipientId: null,
        channel: "voice",
        responseWindowMinutes: 10,
        fallbackBehaviour: "advance_to_next_step",
      },
      {
        order: 3,
        delayMinutes: 10,
        recipientType: "nearby_responder",
        recipientId: null,
        channel: "push",
        responseWindowMinutes: 5,
        fallbackBehaviour: "advance_to_next_step",
      },
      {
        order: 4,
        delayMinutes: 5,
        recipientType: "coordinator",
        recipientId: null,
        channel: "push",
        responseWindowMinutes: 5,
        fallbackBehaviour: "notify_all_remaining",
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildOccurrence(overrides: Partial<RoutineOccurrence> = {}): RoutineOccurrence {
  return {
    id: "occ-1",
    routineId: "routine-1",
    scheduledForUtc: "2026-01-05T09:00:00.000Z",
    scheduledLocalDate: "2026-01-05",
    status: "scheduled",
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgementChannel: null,
    alertId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    careCircleId: "circle-1",
    occurrenceId: "occ-1",
    source: "missed_routine",
    status: "open",
    severity: "urgent",
    currentStage: 0,
    openedAt: NOW,
    claimedAt: null,
    claimedBy: null,
    claimExpiresAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionCode: null,
    resolutionNote: null,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "invitation-1",
    careCircleId: "circle-1",
    invitedByUserId: "coordinator-1",
    invitedEmail: "invitee@example.com",
    invitedPhone: null,
    proposedResponderType: "family",
    proposedRelationship: "sibling",
    tokenHash: "token-hash-1",
    status: "pending",
    expiresAt: "2026-02-01T00:00:00.000Z",
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}
