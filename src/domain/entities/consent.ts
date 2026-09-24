import { z } from "zod";
import { ChannelSchema } from "./careCircle.ts";

export const ConsentTypeSchema = z.enum([
  "circle_participation",
  "share_address_with_nearby_responder",
  "automated_calls_enabled",
  "data_retention",
]);
export type ConsentType = z.infer<typeof ConsentTypeSchema>;

export const ConsentStatusSchema = z.enum(["granted", "revoked"]);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const ConsentRecordSchema = z.object({
  id: z.string().min(1),
  careCircleId: z.string().min(1),
  subjectUserId: z.string().min(1),
  consentType: ConsentTypeSchema,
  policyVersion: z.string().min(1),
  status: ConsentStatusSchema,
  grantedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  recordedBy: z.string().min(1),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const NotificationPreferenceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  careCircleId: z.string().min(1),
  channel: ChannelSchema,
  enabled: z.boolean(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  timezone: z.string().min(1),
  urgentAlertsOverrideQuietHours: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

export const AuditEventSchema = z.object({
  id: z.string().min(1),
  careCircleId: z.string().min(1),
  actorId: z.string().min(1),
  actorType: z.enum(["user", "system"]),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  timestamp: z.string().datetime(),
  // Must never contain secrets or unnecessary health details (Implementation.md §8.1).
  metadata: z.record(z.string(), z.unknown()),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
