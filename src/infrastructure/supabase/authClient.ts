import { createIsomorphicFn } from "@tanstack/react-start";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Supabase auth cannot start without it.`,
    );
  }
  return value;
}

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Pure adapter from a plain "read all cookies" / "write one cookie" pair
 * (however the host framework exposes them) into the {getAll, setAll}
 * shape @supabase/ssr's createServerClient requires. Kept framework-free
 * and exported standalone so it's testable without a real request/response
 * cycle (Implementation.md §11: domain/infra code should be testable in
 * isolation).
 */
export function toCookieMethods(
  read: () => Record<string, string>,
  write: (name: string, value: string, options?: Record<string, unknown>) => void,
) {
  return {
    getAll(): { name: string; value: string }[] {
      return Object.entries(read()).map(([name, value]) => ({ name, value }));
    },
    setAll(cookies: CookieToSet[]): void {
      for (const cookie of cookies) write(cookie.name, cookie.value, cookie.options);
    },
  };
}

let browserClient: SupabaseClient | undefined;

/**
 * Per-platform Supabase Auth client resolver.
 *
 * Server-side (SSR, route guards): creates a fresh client per call, bound to the
 * *current request's* cookies via TanStack Start's AsyncLocalStorage-scoped
 * cookie helpers. Must be constructed per call, never cached at module
 * scope — this app's server runtime (Cloudflare Workers, per
 * .output/server/wrangler.json) reuses one module instance across
 * concurrent requests, so a cached client here would leak one visitor's
 * session into another's request.
 *
 * Browser-side: creates a single cached client bound to document.cookie, safe to
 * reuse for the lifetime of the tab.
 *
 * Only ever uses the anon key — this file must never import or construct a
 * service-role client (Implementation.md §13.3, §18: service-role key never
 * reaches the browser, and there is no reason an end-user auth flow needs
 * elevated privileges).
 */
const resolveClient = createIsomorphicFn()
  .server((): SupabaseClient => {
    const url = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    return createServerClient(url, anonKey, {
      cookies: toCookieMethods(getCookies, setCookie),
    });
  })
  .client((): SupabaseClient => {
    const url = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    browserClient ??= createBrowserClient(url, anonKey);
    return browserClient;
  });

/**
 * Returns the Supabase Auth client to use for the current call.
 * See resolveClient() above for platform-specific behavior.
 */
export function getSupabaseAuthClient(): SupabaseClient {
  return resolveClient();
}
