/**
 * Circle operations (roster, invitations, member priority/permissions, pause,
 * leave, onboarding). Each has a pure `xxxFor(deps, actorId, input)` that
 * checks membership and runs the use-case as the given actor, a server
 * function that supplies the verified actor, and an `api.circle.xxx` wrapper
 * routes call. Input schemas never carry an actor — zod strips unknown keys.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { getCircleRoster } from "@/application/use-cases/getCircleRoster";
import { inviteMember } from "@/application/use-cases/inviteMember";
import { reorderMemberPriority } from "@/application/use-cases/reorderMemberPriority";
import { revokeMemberPermission } from "@/application/use-cases/revokeMemberPermission";
import { setCareCirclePaused } from "@/application/use-cases/setCareCirclePaused";
import { requestLeaveCircle } from "@/application/use-cases/requestLeaveCircle";
import { startCareCircle } from "@/application/use-cases/startCareCircle";
import { runApi } from "@/features/api/runApi";
import { currentActor } from "@/server/actor";
import { requireActiveMember } from "@/server/membership";
import { buildServerDeps } from "@/server/serverDeps";

const circleInput = z.object({ circleId: z.string().min(1) });
type CircleInput = z.infer<typeof circleInput>;

export const inviteInput = circleInput.extend({
  invitedEmail: z.string().nullable(),
  invitedPhone: z.string().nullable(),
  proposedResponderType: z.enum(["family", "nearby_responder"]),
  proposedRelationship: z.string(),
});
type InviteInput = z.infer<typeof inviteInput>;

const memberInput = circleInput.extend({ circleMemberId: z.string().min(1) });
const reorderInput = memberInput.extend({ newPriority: z.number().int() });
const pausedInput = circleInput.extend({ paused: z.boolean() });
const startInput = z.object({
  olderAdultPreferredName: z.string().min(1),
  invitedEmail: z.string().nullable(),
  invitedPhone: z.string().nullable(),
});
type StartInput = z.infer<typeof startInput>;

function auditDeps(deps: AppDeps) {
  return {
    careCircles: deps.careCircleRepository,
    audit: deps.auditRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
  };
}

export async function rosterFor(deps: AppDeps, actorId: string, input: CircleInput) {
  await requireActiveMember(deps, actorId, input.circleId);
  const result = await getCircleRoster(
    { careCircles: deps.careCircleRepository, profiles: deps.profileRepository },
    { careCircleId: input.circleId, actorUserId: actorId },
  );
  const circle = await deps.careCircleRepository.findById(input.circleId);
  return { result, circle };
}

export async function inviteFor(deps: AppDeps, actorId: string, input: InviteInput) {
  await requireActiveMember(deps, actorId, input.circleId);
  return inviteMember(
    {
      careCircles: deps.careCircleRepository,
      invitations: deps.invitationRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    {
      careCircleId: input.circleId,
      actorUserId: actorId,
      invitedEmail: input.invitedEmail,
      invitedPhone: input.invitedPhone,
      proposedResponderType: input.proposedResponderType,
      proposedRelationship: input.proposedRelationship,
    },
  );
}

export async function reorderFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof reorderInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  await reorderMemberPriority(auditDeps(deps), {
    careCircleId: input.circleId,
    actorUserId: actorId,
    circleMemberId: input.circleMemberId,
    newPriority: input.newPriority,
  });
}

export async function revokePermissionFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof memberInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  await revokeMemberPermission(auditDeps(deps), {
    careCircleId: input.circleId,
    actorUserId: actorId,
    circleMemberId: input.circleMemberId,
  });
}

export async function requestLeaveFor(deps: AppDeps, actorId: string, input: CircleInput) {
  await requireActiveMember(deps, actorId, input.circleId);
  return requestLeaveCircle(auditDeps(deps), { careCircleId: input.circleId, userId: actorId });
}

export async function setPausedFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof pausedInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  return setCareCirclePaused(auditDeps(deps), {
    careCircleId: input.circleId,
    actorUserId: actorId,
    paused: input.paused,
  });
}

/**
 * Onboarding: the actor becomes the new circle's coordinator. Returns only
 * what the screen needs — the stored invitation (with its token hash) stays
 * on the server.
 */
export async function startFor(deps: AppDeps, actorId: string, input: StartInput) {
  const { circle, plaintextToken } = await startCareCircle(
    {
      careCircleRepository: deps.careCircleRepository,
      invitationRepository: deps.invitationRepository,
      auditRepository: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { coordinatorUserId: actorId, ...input },
  );
  return { circle, plaintextToken };
}

/** Ids of the circles the actor is an active member of. */
export async function myCircleIdsFor(
  deps: AppDeps,
  actorId: string,
  _input: Record<string, never>,
) {
  const circles = await deps.careCircleRepository.findByUserId(actorId);
  return circles.map((c) => c.id);
}

const serverDeps = async () => ({
  deps: buildServerDeps(),
  actorId: (await currentActor()).userId,
});

export const rosterFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return rosterFor(deps, actorId, data);
  });

export const inviteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inviteInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return inviteFor(deps, actorId, data);
  });

export const reorderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reorderInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return reorderFor(deps, actorId, data);
  });

export const revokePermissionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => memberInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return revokePermissionFor(deps, actorId, data);
  });

export const requestLeaveFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return requestLeaveFor(deps, actorId, data);
  });

export const setPausedFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pausedInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return setPausedFor(deps, actorId, data);
  });

export const startFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return startFor(deps, actorId, data);
  });

export const myCircleIdsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { deps, actorId } = await serverDeps();
  return myCircleIdsFor(deps, actorId, {});
});

export const circleApi = {
  roster: (input: CircleInput) => runApi(rosterFn, rosterFor, input),
  invite: (input: InviteInput) => runApi(inviteFn, inviteFor, input),
  reorder: (input: z.infer<typeof reorderInput>) => runApi(reorderFn, reorderFor, input),
  revokePermission: (input: z.infer<typeof memberInput>) =>
    runApi(revokePermissionFn, revokePermissionFor, input),
  requestLeave: (input: CircleInput) => runApi(requestLeaveFn, requestLeaveFor, input),
  setPaused: (input: z.infer<typeof pausedInput>) => runApi(setPausedFn, setPausedFor, input),
  start: (input: StartInput) => runApi(startFn, startFor, input),
  myCircleIds: () =>
    runApi(
      () => myCircleIdsFn(),
      (deps, actorId) => myCircleIdsFor(deps, actorId, {}),
      {} as Record<string, never>,
    ),
};
