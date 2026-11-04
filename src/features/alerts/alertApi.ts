/**
 * Alerts screen, dashboard summary, claim/resolve, and the due-work poll
 * that generates occurrences and raises missed-routine alerts while someone
 * has the app open. Same shape as circleApi.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { getAlertsForCircle } from "@/application/use-cases/getAlertsForCircle";
import { getRecentActivity } from "@/application/use-cases/getRecentActivity";
import { claimAlert } from "@/application/use-cases/claimAlert";
import { resolveAlert } from "@/application/use-cases/resolveAlert";
import { pollDueWork } from "@/application/use-cases/pollDueWork";
import { ResolutionCodeSchema } from "@/domain/entities/alert";
import { runApi } from "@/features/api/runApi";
import { currentActor } from "@/server/actor";
import { NotAMemberError, requireActiveMember } from "@/features/api/membership";
import { buildServerDeps } from "@/server/serverDeps";

const CLAIM_WINDOW_MINUTES = 15;
const OPEN_EXCLUDED = ["resolved", "unresolved", "cancelled"];

const circleInput = z.object({ circleId: z.string().min(1) });
export const claimInput = z.object({ alertId: z.string().min(1) });
const resolveInput = claimInput.extend({ resolutionCode: ResolutionCodeSchema });
const noInput = z.object({});

function alertsFor(deps: AppDeps, circleId: string) {
  return getAlertsForCircle(
    {
      alerts: deps.alertRepository,
      careCircles: deps.careCircleRepository,
      profiles: deps.profileRepository,
    },
    { careCircleId: circleId },
  );
}

/** Everything the alerts screen shows: alerts, member names, and who was contacted for open ones. */
export async function listFor(deps: AppDeps, actorId: string, input: z.infer<typeof circleInput>) {
  await requireActiveMember(deps, actorId, input.circleId);
  const alerts = await alertsFor(deps, input.circleId);
  const circleMembers = await deps.careCircleRepository.findMembers(input.circleId);
  const members = await Promise.all(
    circleMembers.map(async (m) => ({
      id: m.id,
      relationship: m.relationship,
      responderType: m.responderType,
      preferredName: (await deps.profileRepository.findById(m.userId))?.preferredName ?? null,
    })),
  );
  const open = alerts.filter((a) => !OPEN_EXCLUDED.includes(a.status));
  const recipientsByAlert = Object.fromEntries(
    await Promise.all(
      open.map(async (a) => [a.id, await deps.alertRepository.findRecipients(a.id)] as const),
    ),
  );
  return { alerts, members, recipientsByAlert };
}

/** Dashboard: open alerts and the latest activity. */
export async function summaryFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof circleInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  const [alerts, activity] = await Promise.all([
    alertsFor(deps, input.circleId),
    getRecentActivity({ audit: deps.auditRepository }, { careCircleId: input.circleId, limit: 5 }),
  ]);
  return { openAlerts: alerts.filter((a) => !OPEN_EXCLUDED.includes(a.status)), activity };
}

async function requireAlertMember(deps: AppDeps, actorId: string, alertId: string) {
  const alert = await deps.alertRepository.findById(alertId);
  if (!alert) throw new NotAMemberError();
  await requireActiveMember(deps, actorId, alert.careCircleId);
}

export async function claimFor(deps: AppDeps, actorId: string, input: z.infer<typeof claimInput>) {
  await requireAlertMember(deps, actorId, input.alertId);
  return claimAlert(
    {
      alerts: deps.alertRepository,
      careCircles: deps.careCircleRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { alertId: input.alertId, claimerUserId: actorId, claimWindowMinutes: CLAIM_WINDOW_MINUTES },
  );
}

export async function resolveFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof resolveInput>,
) {
  await requireAlertMember(deps, actorId, input.alertId);
  await resolveAlert(
    {
      alerts: deps.alertRepository,
      occurrences: deps.occurrenceRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    {
      alertId: input.alertId,
      actorUserId: actorId,
      resolutionCode: input.resolutionCode,
      resolutionNote: null,
    },
  );
}

/**
 * Runs due work for the actor's own circles only. Replaced by the scheduled
 * job in Session 4. pollDueWork's findDue is a global query (it was written
 * for single-household local mode), so on the shared server it is narrowed
 * here to occurrences of the actor's own routines — otherwise any signed-in
 * user could raise missed-routine alerts in every family's circle.
 */
export async function runDueWorkFor(
  deps: AppDeps,
  actorId: string,
  _input: z.infer<typeof noInput>,
) {
  const circles = await deps.careCircleRepository.findByUserId(actorId);
  const careCircleIds = circles.map((c) => c.id);
  const routineIds = new Set(
    (await Promise.all(careCircleIds.map((id) => deps.routineRepository.findByCareCircle(id))))
      .flat()
      .map((r) => r.id),
  );
  const occurrences: AppDeps["occurrenceRepository"] = Object.create(deps.occurrenceRepository, {
    findDue: {
      value: async (nowUtc: string) =>
        (await deps.occurrenceRepository.findDue(nowUtc)).filter((o) =>
          routineIds.has(o.routineId),
        ),
    },
  });
  return pollDueWork(
    {
      routines: deps.routineRepository,
      occurrences,
      careCircles: deps.careCircleRepository,
      alerts: deps.alertRepository,
      audit: deps.auditRepository,
      communications: deps.communicationRepository,
      notificationGateway: deps.notificationGateway,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    { careCircleIds },
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

export const summaryFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return summaryFor(deps, actorId, data);
  });

export const claimFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => claimInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return claimFor(deps, actorId, data);
  });

export const resolveFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => resolveInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return resolveFor(deps, actorId, data);
  });

export const runDueWorkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => noInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return runDueWorkFor(deps, actorId, data);
  });

export const alertApi = {
  list: (input: z.infer<typeof circleInput>) => runApi(listFn, listFor, input),
  summary: (input: z.infer<typeof circleInput>) => runApi(summaryFn, summaryFor, input),
  claim: (input: z.infer<typeof claimInput>) => runApi(claimFn, claimFor, input),
  resolve: (input: z.infer<typeof resolveInput>) => runApi(resolveFn, resolveFor, input),
  runDueWork: () => runApi(runDueWorkFn, runDueWorkFor, {}),
};
