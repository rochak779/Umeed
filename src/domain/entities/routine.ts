import { z } from "zod";
import { ChannelSchema } from "./careCircle.ts";

export const RoutineTypeSchema = z.enum([
  "general_checkin",
  "medication",
  "meal",
  "hydration",
  "appointment_prep",
  "movement",
  "custom",
]);
export type RoutineType = z.infer<typeof RoutineTypeSchema>;

export const VisibilitySchema = z.enum(["family_and_nearby", "family_only", "coordinator_only"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const RoutineSchema = z.object({
  id: z.string().min(1),
  careCircleId: z.string().min(1),
  // Null while the circle is still waiting for the older adult to accept —
  // the coordinator may set up routines before consent (Implementation.md
  // §7.3 step 9); acceptInvitation fills it in.
  olderAdultId: z.string().min(1).nullable(),
  type: RoutineTypeSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  // IANA timezone, e.g. "Europe/London" — required so occurrence generation
  // stays correct across DST (Implementation.md §12).
  timezone: z.string().min(1),
  localTime: z.string().regex(/^\d{2}:\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  gracePeriodMinutes: z.number().int().min(0),
  visibility: VisibilitySchema,
  enabled: z.boolean(),
  notificationChannels: z.array(ChannelSchema),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Routine = z.infer<typeof RoutineSchema>;

export const OccurrenceStatusSchema = z.enum([
  "scheduled",
  "awaiting_response",
  "acknowledged",
  "missed",
  "escalating",
  "resolved",
  "cancelled",
]);
export type OccurrenceStatus = z.infer<typeof OccurrenceStatusSchema>;

export const AcknowledgementChannelSchema = z.enum(["in_app", "voice_keypad", "sms"]);
export type AcknowledgementChannel = z.infer<typeof AcknowledgementChannelSchema>;

export const RoutineOccurrenceSchema = z.object({
  id: z.string().min(1),
  routineId: z.string().min(1),
  scheduledForUtc: z.string().datetime(),
  scheduledLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: OccurrenceStatusSchema,
  acknowledgedAt: z.string().datetime().nullable(),
  acknowledgedBy: z.string().nullable(),
  acknowledgementChannel: AcknowledgementChannelSchema.nullable(),
  alertId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RoutineOccurrence = z.infer<typeof RoutineOccurrenceSchema>;

export const EscalationStepSchema = z.object({
  order: z.number().int().min(1),
  delayMinutes: z.number().int().min(0),
  recipientType: z.enum(["older_adult", "nearby_responder", "coordinator", "family"]),
  recipientId: z.string().nullable(),
  channel: ChannelSchema,
  responseWindowMinutes: z.number().int().min(1),
  fallbackBehaviour: z.enum(["advance_to_next_step", "notify_all_remaining"]),
});
export type EscalationStep = z.infer<typeof EscalationStepSchema>;

export const EscalationPolicySchema = z.object({
  id: z.string().min(1),
  routineId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  steps: z.array(EscalationStepSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EscalationPolicy = z.infer<typeof EscalationPolicySchema>;
