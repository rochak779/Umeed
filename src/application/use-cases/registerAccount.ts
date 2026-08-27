import type { AuthProvider, AuthResult } from "../ports/infra";
import type { ProfileRepository } from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";

export type RegisterAccountDeps = {
  authProvider: AuthProvider;
  profileRepository: ProfileRepository;
  clock: Clock;
};

export type RegisterAccountInput = { displayName: string; email: string; password: string };

/**
 * Registers a new account and creates its UserProfile in the same id space
 * as the auth session (Implementation.md §7.2, §8.1: UserProfile carries no
 * role — it is populated once, here, and never again on this path).
 */
export async function registerAccount(
  deps: RegisterAccountDeps,
  input: RegisterAccountInput,
): Promise<AuthResult> {
  const result = await deps.authProvider.register(input);
  if (!result.ok) return result;

  const nowIso = deps.clock.now().toISOString();
  await deps.profileRepository.save({
    id: result.session.userId,
    displayName: input.displayName,
    preferredName: input.displayName,
    phone: null,
    email: input.email,
    timezone: "Europe/London",
    locale: "en-GB",
    accessibilityPreferences: { largeText: false, reducedMotion: false, highContrast: false },
    onboardingStatus: "not_started",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return result;
}
