import type { AppDeps } from "@/application/ports/appDeps";
import type { UserProfile } from "@/domain/entities/profile";

type ProfileActor = { userId: string; email: string; displayName?: string | null };

/**
 * Returns the actor's profile, creating it on first use. In Supabase mode
 * sign-up only creates the auth user (with "Confirm email" on there is no
 * session to create a profile with), so anything that needs the profile row
 * — the session load, or accepting an invitation straight after sign-up,
 * where circle_members.user_id references profiles — calls this first. The
 * id is the verified auth user id; membership and RLS checks depend on it.
 */
export async function ensureProfile(
  deps: Pick<AppDeps, "profileRepository" | "clock">,
  actor: ProfileActor,
): Promise<UserProfile> {
  const existing = await deps.profileRepository.findById(actor.userId);
  if (existing) return existing;
  const nowIso = deps.clock.now().toISOString();
  const displayName = actor.displayName || actor.email.split("@")[0] || "Friend";
  const profile: UserProfile = {
    id: actor.userId,
    displayName,
    preferredName: displayName,
    phone: null,
    address: null,
    email: actor.email,
    timezone: "Europe/London",
    locale: "en-GB",
    accessibilityPreferences: { largeText: false, reducedMotion: false, highContrast: false },
    onboardingStatus: "not_started",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await deps.profileRepository.save(profile);
  return profile;
}
