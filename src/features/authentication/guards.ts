import { redirect } from "@tanstack/react-router";
import { container } from "./container";

/**
 * Protects a route: redirects to /sign-in when there is no session.
 *
 * Known limitation (local-dev only): LocalAuthProvider's session lives in
 * browser localStorage, which does not exist during TanStack Start's
 * server-side render. Guarding is therefore a no-op on the server and only
 * takes effect once the route mounts in the browser — session.tsx's
 * SessionProvider performs the same check client-side immediately after
 * hydration, so an unauthenticated visitor still never sees protected
 * content, just after a first paint rather than before it. Supabase Auth's
 * cookie-based session (Phase 10) removes this gap entirely.
 */
export async function requireSession() {
  if (typeof window === "undefined") return null;
  const session = await container.authProvider.getSession();
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  return session;
}

/** Redirects an already-authenticated visitor away from public-only screens (sign-in, sign-up). */
export async function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  const session = await container.authProvider.getSession();
  if (session) {
    throw redirect({ to: "/app" });
  }
}
