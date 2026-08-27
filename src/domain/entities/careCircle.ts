import { z } from "zod";

export const CareCircleStatusSchema = z.enum([
  "draft",
  "pending_consent",
  "active",
  "paused",
  "closed",
  "deleted_pending_retention",
]);
export type CareCircleStatus = z.infer<typeof CareCircleStatusSchema>;

export const CareCircleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  olderAdultId: z.string().min(1),
  coordinatorId: z.string().min(1),
  status: CareCircleStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CareCircle = z.infer<typeof CareCircleSchema>;

export const ResponderTypeSchema = z.enum([
  "older_adult",
  "family",
  "nearby_responder",
  "coordinator",
]);
export type ResponderType = z.infer<typeof ResponderTypeSchema>;

export const MembershipStatusSchema = z.enum(["invited", "active", "declined", "removed"]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const AvailabilitySchema = z.object({
  // Simple day-of-week + time-of-day window; deliberately coarse for MVP.
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  startLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
  endLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

export const ChannelSchema = z.enum(["in_app", "push", "sms", "voice", "email"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const CircleMemberSchema = z.object({
  id: z.string().min(1),
  careCircleId: z.string().min(1),
  userId: z.string().min(1),
  relationship: z.string().min(1),
  responderType: ResponderTypeSchema,
  isNearby: z.boolean(),
  priority: z.number().int().min(0),
  availability: AvailabilitySchema.nullable(),
  preferredChannel: ChannelSchema,
  membershipStatus: MembershipStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CircleMember = z.infer<typeof CircleMemberSchema>;

export const MemberPermissionSchema = z.object({
  id: z.string().min(1),
  circleMemberId: z.string().min(1),
  canViewRoutineStatus: z.boolean(),
  canViewRoutineNames: z.boolean(),
  canViewMedicationLabels: z.boolean(),
  canViewNotes: z.boolean(),
  canViewAddress: z.boolean(),
  canReceiveAlerts: z.boolean(),
  canManageRoutines: z.boolean(),
  canManageCircle: z.boolean(),
  grantedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});
export type MemberPermission = z.infer<typeof MemberPermissionSchema>;

/**
 * Default permission grant per responder type (Implementation.md §4.4, §13.3).
 * A nearby responder gets the minimal welfare-check surface by default; a
 * coordinator gets full management rights. Callers should still persist an
 * explicit MemberPermission row rather than relying on this at read time.
 */
export function defaultPermissionsFor(
  responderType: ResponderType,
): Omit<MemberPermission, "id" | "circleMemberId" | "grantedAt" | "revokedAt"> {
  switch (responderType) {
    case "coordinator":
      return {
        canViewRoutineStatus: true,
        canViewRoutineNames: true,
        canViewMedicationLabels: true,
        canViewNotes: true,
        canViewAddress: true,
        canReceiveAlerts: true,
        canManageRoutines: true,
        canManageCircle: true,
      };
    case "family":
      return {
        canViewRoutineStatus: true,
        canViewRoutineNames: true,
        canViewMedicationLabels: false,
        canViewNotes: false,
        canViewAddress: true,
        canReceiveAlerts: true,
        canManageRoutines: false,
        canManageCircle: false,
      };
    case "nearby_responder":
      return {
        canViewRoutineStatus: true,
        canViewRoutineNames: false,
        canViewMedicationLabels: false,
        canViewNotes: false,
        canViewAddress: false,
        canReceiveAlerts: true,
        canManageRoutines: false,
        canManageCircle: false,
      };
    case "older_adult":
      return {
        canViewRoutineStatus: true,
        canViewRoutineNames: true,
        canViewMedicationLabels: true,
        canViewNotes: true,
        canViewAddress: true,
        canReceiveAlerts: true,
        canManageRoutines: true,
        canManageCircle: false,
      };
  }
}
