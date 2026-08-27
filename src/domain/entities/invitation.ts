import { z } from "zod";
import { ResponderTypeSchema } from "./careCircle";

export const InvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

/**
 * Invitation (Implementation.md §8.1). `tokenHash` only — never persist a
 * reusable plain-text token, even locally, so the same discipline carries
 * into the Supabase phase without a data-model change.
 */
export const InvitationSchema = z
  .object({
    id: z.string().min(1),
    careCircleId: z.string().min(1),
    invitedByUserId: z.string().min(1),
    invitedEmail: z.string().email().nullable(),
    invitedPhone: z.string().nullable(),
    proposedResponderType: ResponderTypeSchema,
    proposedRelationship: z.string().min(1),
    tokenHash: z.string().min(1),
    status: InvitationStatusSchema,
    expiresAt: z.string().datetime(),
    acceptedByUserId: z.string().nullable(),
    acceptedAt: z.string().datetime().nullable(),
    revokedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .refine((inv) => inv.invitedEmail !== null || inv.invitedPhone !== null, {
    message: "Invitation must have an invitedEmail or invitedPhone",
  });
export type Invitation = z.infer<typeof InvitationSchema>;
