/**
 * Invitation preview (no sign-in needed — the invite link is the credential)
 * and acceptance (binds the membership to the verified user and email).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { previewInvitation } from "@/application/use-cases/previewInvitation";
import { acceptInvitation } from "@/application/use-cases/acceptInvitation";
import { runApiAsActor, runPublicApi } from "@/features/api/runApi";
import { currentActor, type Actor } from "@/server/actor";
import { buildServerDeps } from "@/server/serverDeps";

const previewInput = z.object({ token: z.string().min(1) });
export const acceptInput = z.object({ token: z.string().min(1) });
type TokenInput = z.infer<typeof previewInput>;

export async function previewFor(deps: AppDeps, input: TokenInput) {
  return previewInvitation(
    {
      careCircleRepository: deps.careCircleRepository,
      invitationRepository: deps.invitationRepository,
      profileRepository: deps.profileRepository,
      clock: deps.clock,
    },
    { token: input.token },
  );
}

export async function acceptFor(deps: AppDeps, actor: Actor, input: TokenInput) {
  return acceptInvitation(
    {
      careCircleRepository: deps.careCircleRepository,
      invitationRepository: deps.invitationRepository,
      consentRepository: deps.consentRepository,
      auditRepository: deps.auditRepository,
      routineRepository: deps.routineRepository,
      occurrenceRepository: deps.occurrenceRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { token: input.token, userId: actor.userId, userEmail: actor.email },
  );
}

export const previewFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => previewInput.parse(data))
  .handler(async ({ data }) => previewFor(buildServerDeps(), data));

export const acceptFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => acceptInput.parse(data))
  .handler(async ({ data }) => acceptFor(buildServerDeps(), await currentActor(), data));

export const invitationApi = {
  preview: (input: TokenInput) => runPublicApi(previewFn, previewFor, input),
  accept: (input: TokenInput) => runApiAsActor(acceptFn, acceptFor, input),
};
