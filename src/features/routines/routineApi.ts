/**
 * Routines (coordinator view) and the older adult's home screen: next
 * routine, "I've done this", "I need help". Same shape as circleApi.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { createRoutine } from "@/application/use-cases/createRoutine";
import { setRoutinePaused } from "@/application/use-cases/setRoutinePaused";
import { getNextRoutineForOlderAdult } from "@/application/use-cases/getNextRoutineForOlderAdult";
import { acknowledgeOccurrence } from "@/application/use-cases/acknowledgeOccurrence";
import { raiseDirectHelpAlert } from "@/application/use-cases/raiseDirectHelpAlert";
import { hasPermission } from "@/domain/policies/permissionGuard";
import { RoutineTypeSchema } from "@/domain/entities/routine";
import { runApi } from "@/features/api/runApi";
import { currentActor } from "@/server/actor";
import { NotAMemberError, requireActiveMember } from "@/features/api/membership";
import { buildServerDeps } from "@/server/serverDeps";

const circleInput = z.object({ circleId: z.string().min(1) });
const createInput = circleInput.extend({
  type: RoutineTypeSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  timezone: z.string().min(1),
  localTime: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  startDate: z.string().min(1),
  endDate: z.string().nullable(),
  gracePeriodMinutes: z.number().int().min(0),
});
const pausedInput = z.object({ routineId: z.string().min(1), paused: z.boolean() });
const occurrenceInput = z.object({ occurrenceId: z.string().min(1) });
const noInput = z.object({});

export async function listFor(deps: AppDeps, actorId: string, input: z.infer<typeof circleInput>) {
  const member = await requireActiveMember(deps, actorId, input.circleId);
  const routines = await deps.routineRepository.findByCareCircle(input.circleId);
  const permission = await deps.careCircleRepository.findPermission(member.id);
  return { routines, canManageRoutines: hasPermission(permission, "canManageRoutines") };
}

/** The circle's older adult comes from the stored circle, never from the browser. */
export async function createFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof createInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  const circle = await deps.careCircleRepository.findById(input.circleId);
  const { circleId, ...routine } = input;
  return createRoutine(
    {
      careCircles: deps.careCircleRepository,
      routines: deps.routineRepository,
      occurrences: deps.occurrenceRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    {
      ...routine,
      actorUserId: actorId,
      careCircleId: circleId,
      olderAdultId: circle?.olderAdultId ?? null,
    },
  );
}

async function requireRoutineMember(deps: AppDeps, actorId: string, routineId: string) {
  const routine = await deps.routineRepository.findById(routineId);
  if (!routine) throw new NotAMemberError();
  await requireActiveMember(deps, actorId, routine.careCircleId);
}

export async function setPausedFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof pausedInput>,
) {
  await requireRoutineMember(deps, actorId, input.routineId);
  return setRoutinePaused(
    {
      routines: deps.routineRepository,
      careCircles: deps.careCircleRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { routineId: input.routineId, actorUserId: actorId, paused: input.paused },
  );
}

export async function nextForOlderAdultFor(
  deps: AppDeps,
  actorId: string,
  _input: z.infer<typeof noInput>,
) {
  return getNextRoutineForOlderAdult(
    {
      careCircles: deps.careCircleRepository,
      routines: deps.routineRepository,
      occurrences: deps.occurrenceRepository,
    },
    { olderAdultUserId: actorId },
  );
}

export async function acknowledgeFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof occurrenceInput>,
) {
  const occurrence = await deps.occurrenceRepository.findById(input.occurrenceId);
  if (!occurrence) throw new NotAMemberError();
  await requireRoutineMember(deps, actorId, occurrence.routineId);
  return acknowledgeOccurrence(
    {
      routines: deps.routineRepository,
      occurrences: deps.occurrenceRepository,
      careCircles: deps.careCircleRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { occurrenceId: input.occurrenceId, actorUserId: actorId, channel: "in_app" },
  );
}

export async function raiseHelpFor(
  deps: AppDeps,
  actorId: string,
  _input: z.infer<typeof noInput>,
) {
  return raiseDirectHelpAlert(
    {
      careCircles: deps.careCircleRepository,
      alerts: deps.alertRepository,
      audit: deps.auditRepository,
      communications: deps.communicationRepository,
      notificationGateway: deps.notificationGateway,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { olderAdultUserId: actorId },
  );
}

const serverDeps = async () => ({
  deps: buildServerDeps(),
  actorId: (await currentActor()).userId,
});

export const listFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return listFor(deps, actorId, data);
  });

export const createFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => createInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return createFor(deps, actorId, data);
  });

export const setPausedFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => pausedInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return setPausedFor(deps, actorId, data);
  });

export const nextForOlderAdultFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => noInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return nextForOlderAdultFor(deps, actorId, data);
  });

export const acknowledgeFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => occurrenceInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return acknowledgeFor(deps, actorId, data);
  });

export const raiseHelpFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => noInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return raiseHelpFor(deps, actorId, data);
  });

export const routineApi = {
  list: (input: z.infer<typeof circleInput>) => runApi(listFn, listFor, input),
  create: (input: z.infer<typeof createInput>) => runApi(createFn, createFor, input),
  setPaused: (input: z.infer<typeof pausedInput>) => runApi(setPausedFn, setPausedFor, input),
  nextForOlderAdult: () => runApi(nextForOlderAdultFn, nextForOlderAdultFor, {}),
  acknowledge: (input: z.infer<typeof occurrenceInput>) =>
    runApi(acknowledgeFn, acknowledgeFor, input),
  raiseHelp: () => runApi(raiseHelpFn, raiseHelpFor, {}),
};
