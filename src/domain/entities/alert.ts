import { z } from "zod";
import { ChannelSchema } from "./careCircle.ts";

export const AlertSourceSchema = z.enum(["missed_routine", "direct_help", "manual"]);
export type AlertSource = z.infer<typeof AlertSourceSchema>;

export const AlertStatusSchema = z.enum([
  "open",
  "notifying",
  "unclaimed",
  "claimed",
  "resolved",
  "unresolved",
  "cancelled",
]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const AlertSeveritySchema = z.enum(["routine", "urgent"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const ResolutionCodeSchema = z.enum([
  "spoke_all_okay",
  "checked_in_person_all_okay",
  "older_adult_asked_for_family",
  "professional_assistance_contacted",
  "unable_to_reach",
  "false_or_accidental",
  "other",
]);
export type ResolutionCode = z.infer<typeof ResolutionCodeSchema>;

export const AlertSchema = z.object({
  id: z.string().min(1),
  careCircleId: z.string().min(1),
  occurrenceId: z.string().nullable(),
  source: AlertSourceSchema,
  status: AlertStatusSchema,
  severity: AlertSeveritySchema,
  currentStage: z.number().int().min(0),
  openedAt: z.string().datetime(),
  claimedAt: z.string().datetime().nullable(),
  claimedBy: z.string().nullable(),
  claimExpiresAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedBy: z.string().nullable(),
  resolutionCode: ResolutionCodeSchema.nullable(),
  resolutionNote: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const DeliveryStatusSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "failed",
  "accepted",
  "declined",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const AlertRecipientSchema = z.object({
  id: z.string().min(1),
  alertId: z.string().min(1),
  circleMemberId: z.string().min(1),
  channel: ChannelSchema,
  stage: z.number().int().min(0),
  deliveryStatus: DeliveryStatusSchema,
  providerReference: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  respondedAt: z.string().datetime().nullable(),
  response: z.string().nullable(),
});
export type AlertRecipient = z.infer<typeof AlertRecipientSchema>;

export const CommunicationEventSchema = z.object({
  id: z.string().min(1),
  alertId: z.string().nullable(),
  occurrenceId: z.string().nullable(),
  recipientId: z.string().min(1),
  channel: ChannelSchema,
  direction: z.enum(["outbound", "inbound"]),
  providerReference: z.string().nullable(),
  status: DeliveryStatusSchema,
  attemptNumber: z.number().int().min(1),
  errorCode: z.string().nullable(),
  // Idempotency key for the underlying communication attempt (Implementation.md §12).
  idempotencyKey: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CommunicationEvent = z.infer<typeof CommunicationEventSchema>;
