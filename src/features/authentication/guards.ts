import { redirect } from "@tanstack/react-router";
import { container } from "./container";

/**
 * Protects a route: redirects to /sign-in when there is no session.
 *
 * LocalAuthProvider's session lives in browser localStorage, which does not
 * exist during server-side rendering — checking it there would always see
 * "no session" and wrongly redirect a signed-in user before hydration ever
 * runs client-side (where session.tsx's SessionProvider does the same
 * check correctly). SupabaseAuthProvider has no such gap (Phase 10): its
 * session is cookie-backed and resolves identically on server and browser.
 * The bail below is therefore scoped to local mode only.
 */
export async function requireSession() {
  const isLocalMode = process.env["DATA_ADAPTER"] !== "supabase";
  if (typeof window === "undefined" && isLocalMode) return null;
  const session = await container.authProvider.getSession();
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  return session;
}

/** Redirects an already-authenticated visitor away from public-only screens (sign-in, sign-up). */
export async function redirectIfAuthenticated() {
  const isLocalMode = process.env["DATA_ADAPTER"] !== "supabase";
  if (typeof window === "undefined" && isLocalMode) return;
  const session = await container.authProvider.getSession();
  if (session) {
    throw redirect({ to: "/app" });
  }
}
