import type {
  CareCircleRepository,
  InvitationRepository,
  ProfileRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import { hashToken } from "../../shared/token/hashToken";
import type { ResponderType } from "../../domain/entities/careCircle";

export type PreviewInvitationDeps = {
  careCircleRepository: CareCircleRepository;
  invitationRepository: InvitationRepository;
  profileRepository: ProfileRepository;
  clock: Clock;
};

export type PreviewInvitationResult =
  | {
      ok: true;
      circleName: string;
      inviterName: string;
      proposedResponderType: ResponderType;
      invitedEmail: string | null;
    }
  | { ok: false; code: "invalid_token" | "expired" | "revoked" | "already_used" };

/**
 * Read-only lookup so the invite-acceptance screen (Implementation.md §7.3:
 * "See the inviter, older adult and proposed role") can show what's being
 * proposed before the invitee authenticates or commits to joining.
 */
export async function previewInvitation(
  deps: PreviewInvitationDeps,
  input: { token: string },
): Promise<PreviewInvitationResult> {
  const invitation = await deps.invitationRepository.findByTokenHash(hashToken(input.token));
  if (!invitation) return { ok: false, code: "invalid_token" };
  if (invitation.status === "revoked") return { ok: false, code: "revoked" };
  if (invitation.status === "accepted") return { ok: false, code: "already_used" };
  if (invitation.expiresAt <= deps.clock.now().toISOString()) return { ok: false, code: "expired" };

  const [circle, inviter] = await Promise.all([
    deps.careCircleRepository.findById(invitation.careCircleId),
    deps.profileRepository.findById(invitation.invitedByUserId),
  ]);

  return {
    ok: true,
    circleName: circle?.name ?? "a care circle",
    inviterName: inviter?.preferredName ?? "Someone",
    proposedResponderType: invitation.proposedResponderType,
    invitedEmail: invitation.invitedEmail,
  };
}
