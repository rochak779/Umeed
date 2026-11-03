/** Consent records for a circle. Same shape as circleApi.ts. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { setConsent } from "@/application/use-cases/setConsent";
import { ConsentStatusSchema, ConsentTypeSchema } from "@/domain/entities/consent";
import { runApi } from "@/features/api/runApi";
import { currentActor } from "@/server/actor";
import { requireActiveMember } from "@/features/api/membership";
import { buildServerDeps } from "@/server/serverDeps";

const circleInput = z.object({ circleId: z.string().min(1) });
const setInput = circleInput.extend({
  consentType: ConsentTypeSchema,
  status: ConsentStatusSchema,
});

export async function listConsentFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof circleInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  return deps.consentRepository.findByCareCircle(input.circleId);
}

export async function setConsentFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof setInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  await setConsent(
    {
      careCircles: deps.careCircleRepository,
      consents: deps.consentRepository,
      audit: deps.auditRepository,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    },
    {
      careCircleId: input.circleId,
      actorUserId: actorId,
      consentType: input.consentType,
      status: input.status,
    },
  );
}

const serverDeps = async () => ({
  deps: buildServerDeps(),
  actorId: (await currentActor()).userId,
});

export const listConsentFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return listConsentFor(deps, actorId, data);
  });

export const setConsentFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return setConsentFor(deps, actorId, data);
  });

export const consentApi = {
  list: (input: z.infer<typeof circleInput>) => runApi(listConsentFn, listConsentFor, input),
  set: (input: z.infer<typeof setInput>) => runApi(setConsentFn, setConsentFor, input),
};
