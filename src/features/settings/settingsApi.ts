/** The signed-in user's own profile and notification preferences. Same shape as circleApi.ts. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppDeps } from "@/application/ports/appDeps";
import { updateNotificationPreference } from "@/application/use-cases/updateNotificationPreference";
import { ChannelSchema } from "@/domain/entities/careCircle";
import { runApi } from "@/features/api/runApi";
import { currentActor } from "@/server/actor";
import { requireActiveMember } from "@/features/api/membership";
import { buildServerDeps } from "@/server/serverDeps";

const circleInput = z.object({ circleId: z.string().min(1) });
const preferenceInput = circleInput.extend({
  channel: ChannelSchema,
  enabled: z.boolean(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  timezone: z.string().min(1),
  urgentAlertsOverrideQuietHours: z.boolean(),
});
export const saveProfileInput = z.object({
  displayName: z.string().min(1),
  preferredName: z.string().min(1),
});

export async function preferencesFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof circleInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  return deps.consentRepository.findNotificationPreferences(actorId, input.circleId);
}

export async function updatePreferenceFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof preferenceInput>,
) {
  await requireActiveMember(deps, actorId, input.circleId);
  const { circleId, ...preference } = input;
  return updateNotificationPreference(
    { consent: deps.consentRepository, clock: deps.clock, idGenerator: deps.idGenerator },
    { ...preference, userId: actorId, careCircleId: circleId },
  );
}

export async function saveProfileFor(
  deps: AppDeps,
  actorId: string,
  input: z.infer<typeof saveProfileInput>,
) {
  const profile = await deps.profileRepository.findById(actorId);
  if (!profile) throw new Error("profile_not_found");
  await deps.profileRepository.save({
    ...profile,
    displayName: input.displayName,
    preferredName: input.preferredName,
    updatedAt: deps.clock.now().toISOString(),
  });
}

const serverDeps = async () => ({
  deps: buildServerDeps(),
  actorId: (await currentActor()).userId,
});

export const preferencesFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => circleInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return preferencesFor(deps, actorId, data);
  });

export const updatePreferenceFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => preferenceInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return updatePreferenceFor(deps, actorId, data);
  });

export const saveProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveProfileInput.parse(data))
  .handler(async ({ data }) => {
    const { deps, actorId } = await serverDeps();
    return saveProfileFor(deps, actorId, data);
  });

export const settingsApi = {
  preferences: (input: z.infer<typeof circleInput>) => runApi(preferencesFn, preferencesFor, input),
  updatePreference: (input: z.infer<typeof preferenceInput>) =>
    runApi(updatePreferenceFn, updatePreferenceFor, input),
  saveProfile: (input: z.infer<typeof saveProfileInput>) =>
    runApi(saveProfileFn, saveProfileFor, input),
};
