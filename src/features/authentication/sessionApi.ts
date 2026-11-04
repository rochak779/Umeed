import { createServerFn } from "@tanstack/react-start";
import type { AppDeps } from "@/application/ports/appDeps";
import type { AuthResult, Session } from "@/application/ports/infra";
import {
  registerAccount,
  type RegisterAccountInput,
} from "@/application/use-cases/registerAccount";
import type { UserProfile } from "@/domain/entities/profile";
import { currentActor, UnauthenticatedError, type Actor } from "@/server/actor";
import { buildServerDeps } from "@/server/serverDeps";
import { isSupabaseMode } from "@/shared/config";
import { container } from "./container";
import { ensureProfile } from "./ensureProfile";
import type { ActiveMembership } from "./SessionContext";

export type SessionState = { profile: UserProfile | null; memberships: ActiveMembership[] };

async function loadMemberships(deps: Pick<AppDeps, "careCircleRepository">, userId: string) {
  const circles = await deps.careCircleRepository.findByUserId(userId);
  const withMembers = await Promise.all(
    circles.map(async (circle) => {
      const member = await deps.careCircleRepository.findMemberByUserAndCircle(userId, circle.id);
      return member?.membershipStatus === "active" ? { circle, member } : null;
    }),
  );
  return withMembers.filter((m): m is ActiveMembership => m !== null);
}

/**
 * Server side of "who am I and which circles am I in". Ensures the profile
 * exists first (see ensureProfile).
 */
export async function loadSessionStateFor(
  deps: Pick<AppDeps, "profileRepository" | "careCircleRepository" | "clock">,
  actor: Actor,
): Promise<{ profile: UserProfile; memberships: ActiveMembership[] }> {
  const profile = await ensureProfile(deps, actor);
  return { profile, memberships: await loadMemberships(deps, actor.userId) };
}

export const loadSessionStateFn = createServerFn({ method: "GET" }).handler(async () => {
  let actor: Actor;
  try {
    actor = await currentActor();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
  return loadSessionStateFor(buildServerDeps(), actor);
});

export const api = {
  session: {
    /** Current session, profile and active memberships, or null when signed out. */
    async load(): Promise<({ session: Session } & SessionState) | null> {
      const session = await container.authProvider.getSession();
      if (!session) return null;
      if (isSupabaseMode()) {
        const state = await loadSessionStateFn();
        return state ? { session, ...state } : null;
      }
      const [profile, memberships] = await Promise.all([
        container.profileRepository.findById(session.userId),
        loadMemberships(container, session.userId),
      ]);
      return { session, profile, memberships };
    },

    /**
     * Creates the account. In Supabase mode only the auth user is created
     * here (in the browser, anon key); the profile is created server-side by
     * the next `load()`.
     */
    register(input: RegisterAccountInput): Promise<AuthResult> {
      if (isSupabaseMode()) return container.authProvider.register(input);
      return registerAccount(
        {
          authProvider: container.authProvider,
          profileRepository: container.profileRepository,
          clock: container.clock,
        },
        input,
      );
    },
  },
};
