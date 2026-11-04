import { getSupabaseAuthClient } from "@/infrastructure/supabase/authClient";

/** Thrown by server functions when the request carries no valid signed-in user. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

export type VerifiedUser = { id: string; email: string; displayName?: string | null };
export type Actor = { userId: string; email: string; displayName?: string | null };

/**
 * Turns "who does the auth cookie say this is?" into the actor every server
 * function acts as. Never accept an actor id from the browser instead.
 */
export async function resolveActor(getUser: () => Promise<VerifiedUser | null>): Promise<Actor> {
  const user = await getUser();
  if (!user) throw new UnauthenticatedError();
  return {
    userId: user.id,
    email: user.email,
    ...(user.displayName !== undefined ? { displayName: user.displayName } : {}),
  };
}

/**
 * The actor for the current request. `auth.getUser()` revalidates the JWT
 * with Supabase rather than trusting the cookie's contents.
 */
export function currentActor(): Promise<Actor> {
  return resolveActor(async () => {
    const { data, error } = await getSupabaseAuthClient().auth.getUser();
    if (error || !data.user) return null;
    const displayName = data.user.user_metadata?.["display_name"];
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      displayName: typeof displayName === "string" ? displayName : null,
    };
  });
}
