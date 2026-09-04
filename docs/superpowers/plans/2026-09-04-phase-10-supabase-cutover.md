# Phase 10 — Supabase Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LocalAuthProvider` with a `SupabaseAuthProvider` behind the existing `AuthProvider` port, add live Realtime updates for alerts, and move occurrence/escalation processing to a server-side scheduled Edge Function — so the app works for real users without a browser tab staying open.

**Architecture:** Every change lands behind an existing port or an existing `DATA_ADAPTER` env switch — no caller-facing interface changes except two documented, narrow adaptations (email-confirmation gating, and the recovery-link query param). The Supabase auth client is constructed per-request server-side (cookie-scoped, safe under a shared Workers module) and once as a browser singleton — never a fixed module-level client the way repositories are today, since auth state is per-request/per-tab, not global.

**Tech Stack:** `@supabase/ssr` (new), `@supabase/supabase-js` (existing), `@tanstack/react-start/server` cookie helpers, Supabase Edge Functions (Deno), `pg_cron` + `pg_net` Postgres extensions.

**Spec:** `docs/superpowers/specs/2026-09-04-phase-10-supabase-cutover-design.md`

## Global Constraints

- No caller of `container.authProvider` changes its call signature — `AuthProvider` in `src/application/ports/infra.ts` is unchanged.
- The Supabase service-role key is never used by `SupabaseAuthProvider` or in any browser-reachable code — only the anon key, exactly like every other Supabase Auth client in a browser.
- `DATA_ADAPTER=local` must keep working exactly as today, with zero Supabase dependency, for the full local test suite (`bun run test`).
- Supabase-dependent tests follow the existing skip pattern (`describe.skipIf(!hasSupabaseEnv)`) already used in `test/contracts/supabaseRepositories.contract.test.ts` and `supabaseRls.contract.test.ts` — never a hard failure on a machine without credentials.
- Decision from design review: Supabase's "Confirm email required to sign in" setting is turned **off** for the `umeed` project, so `signUp()` returns a session immediately (parity with `LocalAuthProvider`). Consequence, accepted deliberately: `isEmailVerified()` is always `true` in Supabase mode, so the pending-verification banner/route is effectively dormant under Supabase — this is documented, not hidden.
- The live Supabase project is `umeed` (ref `focqwbtnltixlzfvovcn`, eu-west-2); all 6 existing migrations are already applied there. `.env.local` already has working `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_PASSWORD` for it.

---

### Task 1: Add `@supabase/ssr` and configure the live project's Auth settings

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `.env.example` (document `PUBLIC_APP_URL` is now load-bearing, not just aspirational)

**Interfaces:**
- Produces: `@supabase/ssr`'s `createBrowserClient` and `createServerClient` exports, consumed by Task 2.

- [ ] **Step 1: Add the dependency**

```bash
bun add @supabase/ssr
```

- [ ] **Step 2: Configure the live `umeed` project's Auth settings (manual, one-time)**

In the Supabase dashboard for project `focqwbtnltixlzfvovcn` (Authentication → Providers → Email):
- Turn **off** "Confirm email" (so `signUp` returns a session immediately — see Global Constraints).
- Under Authentication → URL Configuration: set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/reset-password` to **Redirect URLs**.

Record that these were set in the PR/commit description — there is no CLI-scriptable equivalent for these two toggles, so they must be redone if the project is ever recreated.

- [ ] **Step 3: Confirm `.env.local` already has everything needed**

```bash
grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|PUBLIC_APP_URL" .env.local
```

Expected: all three present and non-empty (they already are, per the Phase 9 setup — this step is a sanity check, not new configuration).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock .env.example
git commit -m "chore: add @supabase/ssr dependency for phase 10 auth cutover"
```

---

### Task 2: Supabase client factory with per-request cookie bridging

**Files:**
- Create: `src/infrastructure/supabase/authClient.ts`
- Test: `src/infrastructure/supabase/authClient.test.ts`

**Interfaces:**
- Consumes: `getCookies`, `setCookie` from `@tanstack/react-start/server`; `createServerClient`, `createBrowserClient` from `@supabase/ssr`; `requireEnv`-style env lookup already used in `src/infrastructure/supabase/client.ts`.
- Produces:
  - `toCookieMethods(read: () => Record<string, string>, write: (name: string, value: string, options?: Record<string, unknown>) => void): { getAll(): { name: string; value: string }[]; setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void }` — pure, framework-agnostic cookie bridge (this is what Step 1's test targets).
  - `getSupabaseAuthClient(): SupabaseClient` — returns a fresh per-request server client when `typeof window === "undefined"`, or a cached browser singleton otherwise. Consumed by Task 3.

- [ ] **Step 1: Write the failing test for the pure cookie bridge**

```typescript
// src/infrastructure/supabase/authClient.test.ts
import { describe, expect, it, vi } from "vitest";
import { toCookieMethods } from "./authClient";

describe("toCookieMethods", () => {
  it("maps a plain cookie record into the {name,value}[] shape @supabase/ssr expects", () => {
    const read = () => ({ "sb-access-token": "abc", "sb-refresh-token": "def" });
    const write = vi.fn();
    const bridge = toCookieMethods(read, write);

    expect(bridge.getAll()).toEqual([
      { name: "sb-access-token", value: "abc" },
      { name: "sb-refresh-token", value: "def" },
    ]);
  });

  it("forwards each cookie in setAll to the write function with its options", () => {
    const write = vi.fn();
    const bridge = toCookieMethods(() => ({}), write);

    bridge.setAll([
      { name: "sb-access-token", value: "new-value", options: { maxAge: 3600 } },
      { name: "sb-refresh-token", value: "", options: { maxAge: 0 } },
    ]);

    expect(write).toHaveBeenNthCalledWith(1, "sb-access-token", "new-value", { maxAge: 3600 });
    expect(write).toHaveBeenNthCalledWith(2, "sb-refresh-token", "", { maxAge: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run src/infrastructure/supabase/authClient.test.ts`
Expected: FAIL — `authClient.ts` does not exist yet.

- [ ] **Step 3: Implement the client factory**

```typescript
// src/infrastructure/supabase/authClient.ts
import { createBrowserClient, createServerClient } from "@supabase/ssr";
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
 * Returns the Supabase Auth client to use for the current call:
 * - Server-side (SSR, route guards): a fresh client per call, bound to the
 *   *current request's* cookies via TanStack Start's AsyncLocalStorage-scoped
 *   cookie helpers. Must be constructed per call, never cached at module
 *   scope — this app's server runtime (Cloudflare Workers, per
 *   .output/server/wrangler.json) reuses one module instance across
 *   concurrent requests, so a cached client here would leak one visitor's
 *   session into another's request.
 * - Browser-side: a single cached client bound to document.cookie, safe to
 *   reuse for the lifetime of the tab.
 *
 * Only ever uses the anon key — this file must never import or construct a
 * service-role client (Implementation.md §13.3, §18: service-role key never
 * reaches the browser, and there is no reason an end-user auth flow needs
 * elevated privileges).
 */
export function getSupabaseAuthClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");

  if (typeof window === "undefined") {
    // Lazy import: this pulls in @tanstack/react-start/server's
    // AsyncLocalStorage-backed helpers, which must not be evaluated in a
    // browser bundle.
    const { getCookies, setCookie } = require("@tanstack/react-start/server") as {
      getCookies: () => Record<string, string>;
      setCookie: (name: string, value: string, options?: Record<string, unknown>) => void;
    };
    return createServerClient(url, anonKey, {
      cookies: toCookieMethods(getCookies, setCookie),
    });
  }

  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run src/infrastructure/supabase/authClient.test.ts`
Expected: PASS (2 tests) — this test only exercises `toCookieMethods`, which needs no live Supabase project or DOM.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/supabase/authClient.ts src/infrastructure/supabase/authClient.test.ts
git commit -m "feat: add cookie-bridged supabase auth client factory"
```

---

### Task 3: `SupabaseAuthProvider`

**Files:**
- Create: `src/infrastructure/supabase/auth/SupabaseAuthProvider.ts`
- Test: `src/infrastructure/supabase/auth/SupabaseAuthProvider.contract.test.ts`

**Interfaces:**
- Consumes: `AuthProvider`, `AuthResult`, `Session` from `src/application/ports/infra.ts`; `SupabaseClient` from `@supabase/supabase-js`.
- Produces: `class SupabaseAuthProvider implements AuthProvider`, constructed as `new SupabaseAuthProvider(getClient: () => SupabaseClient)` — the indirection lets Task 4 pass the real `getSupabaseAuthClient` from Task 2, and lets this task's tests pass a fixed anon client instead (no cookie/request machinery needed to test auth *behavior*).

- [ ] **Step 1: Write the failing contract test**

This mirrors the behavioural contract already proven for `LocalAuthProvider.test.ts`, run against the live `umeed` project, skipped without credentials exactly like the existing Supabase contract suites.

```typescript
// src/infrastructure/supabase/auth/SupabaseAuthProvider.contract.test.ts
import { describe, expect, it } from "vitest";
import { createSupabaseAnonClient } from "@/infrastructure/supabase/client";
import { SupabaseAuthProvider } from "./SupabaseAuthProvider";

const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) && Boolean(process.env["SUPABASE_ANON_KEY"]);

function makeProvider() {
  const client = createSupabaseAnonClient();
  return new SupabaseAuthProvider(() => client);
}

function uniqueEmail(): string {
  return `test-${crypto.randomUUID()}@example.invalid`;
}

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider.register", () => {
  it("creates an account and returns an active session immediately", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    const result = await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.email).toBe(email);
  });

  it("rejects a second registration with the same email", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.register({ displayName: "Sarah 2", email, password: "correct-horse-2" });
    expect(result).toEqual({ ok: false, code: "email_taken" });
  });
});

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider.signIn / signOut", () => {
  it("signs in with the correct password", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.signIn({ email, password: "correct-horse-1" });
    expect(result.ok).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    const result = await auth.signIn({ email, password: "wrong-password" });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("clears the session on sign out", async () => {
    const auth = makeProvider();
    const email = uniqueEmail();
    await auth.register({ displayName: "Sarah", email, password: "correct-horse-1" });
    expect(await auth.getSession()).not.toBeNull();
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });
});

describe.skipIf(!hasSupabaseEnv)("SupabaseAuthProvider password reset", () => {
  it("requestPasswordReset never reveals whether the email exists", async () => {
    const auth = makeProvider();
    await expect(auth.requestPasswordReset("nobody-here@example.invalid")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run src/infrastructure/supabase/auth/SupabaseAuthProvider.contract.test.ts`
Expected: FAIL — `SupabaseAuthProvider.ts` does not exist yet. (If `SUPABASE_URL`/`SUPABASE_ANON_KEY` aren't loaded in your shell, first run `set -a && source .env.local && set +a` — the same step already needed for the existing Supabase contract suites.)

- [ ] **Step 3: Implement `SupabaseAuthProvider`**

```typescript
// src/infrastructure/supabase/auth/SupabaseAuthProvider.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthResult, Session } from "@/application/ports/infra";

function toSession(user: { id: string; email?: string }, expiresAt: string): Session {
  return { userId: user.id, email: user.email ?? "", expiresAt };
}

/**
 * Supabase Auth adapter for the AuthProvider port (Implementation.md §11.1,
 * Phase 10). Two methods below are genuine adaptations, not 1:1 passthroughs
 * — see the design doc §3.2 for why:
 *
 * - verifyEmail / isEmailVerified: with "Confirm email" turned off for this
 *   project (Global Constraints), Supabase confirms every account
 *   immediately on signUp. There is no separate token to redeem, so these
 *   just report the current session's actual confirmation state rather than
 *   performing a manual redemption.
 * - resetPassword: Supabase's recovery link establishes a recovery session
 *   directly (PKCE `code` exchange) rather than handing the app a bare
 *   token to redeem against a stored record. `input.token` here is that
 *   PKCE code — see Task 6 for the one-line UI adaptation that renames the
 *   query param it's read from.
 */
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly getClient: () => SupabaseClient) {}

  async register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const client = this.getClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) {
      if (error.status === 422 || error.code === "user_already_exists") {
        return { ok: false, code: "email_taken" };
      }
      return { ok: false, code: "unknown_error" };
    }
    if (!data.session || !data.user) {
      // Should not happen with "Confirm email" off (Global Constraints) —
      // treated as a hard failure rather than silently returning a
      // sessionless "ok" the AuthResult type can't represent.
      return { ok: false, code: "unknown_error" };
    }
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async signIn(input: { email: string; password: string }): Promise<AuthResult> {
    const client = this.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session || !data.user) {
      return { ok: false, code: "invalid_credentials" };
    }
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async signOut(): Promise<void> {
    await this.getClient().auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const client = this.getClient();
    // getUser() revalidates the JWT with Supabase rather than trusting a
    // possibly-stale cookie — the recommended check on the server
    // (https://supabase.com/docs/guides/auth/server-side/nextjs, same
    // guidance applies to any SSR framework). getSession() afterwards then
    // reads the (now-refreshed-if-needed) session for its expiry.
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return null;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return null;
    return toSession(userData.user, new Date(sessionData.session.expires_at! * 1000).toISOString());
  }

  onSessionChange(handler: (session: Session | null) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const {
      data: { subscription },
    } = this.getClient().auth.onAuthStateChange((_event, session) => {
      handler(session?.user ? toSession(session.user, new Date(session.expires_at! * 1000).toISOString()) : null);
    });
    return () => subscription.unsubscribe();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const appUrl = process.env["PUBLIC_APP_URL"] ?? "http://localhost:3000";
    // Supabase itself never reveals whether the email exists — same
    // no-op-looking success either way, matching LocalAuthProvider's
    // documented behaviour.
    await this.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });
  }

  async resetPassword(input: { token: string; newPassword: string }): Promise<AuthResult> {
    const client = this.getClient();
    // input.token is the PKCE `code` from the recovery link (see class
    // doc comment). Exchanging it establishes the recovery session that
    // updateUser then acts on.
    const { data, error } = await client.auth.exchangeCodeForSession(input.token);
    if (error || !data.session || !data.user) {
      return { ok: false, code: "invalid_or_expired_token" };
    }
    const { error: updateError } = await client.auth.updateUser({ password: input.newPassword });
    if (updateError) return { ok: false, code: "invalid_or_expired_token" };
    return {
      ok: true,
      session: toSession(data.user, new Date(data.session.expires_at! * 1000).toISOString()),
    };
  }

  async verifyEmail(_token: string): Promise<boolean> {
    // No separate token to redeem under this project's settings (class doc
    // comment) — report whatever the current session's real state is.
    const session = await this.getSession();
    if (!session) return false;
    const { data } = await this.getClient().auth.getUser();
    return Boolean(data.user?.email_confirmed_at);
  }

  async isEmailVerified(userId: string): Promise<boolean> {
    const { data } = await this.getClient().auth.getUser();
    // Can only answer for the currently signed-in user via the anon client
    // — every real call site (verify-email.tsx) only ever asks about the
    // active session's own user, never an arbitrary id.
    if (!data.user || data.user.id !== userId) return false;
    return Boolean(data.user.email_confirmed_at);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run src/infrastructure/supabase/auth/SupabaseAuthProvider.contract.test.ts`
Expected: PASS (6 tests) against the live `umeed` project.

- [ ] **Step 5: Run the full local suite to confirm nothing broke**

Run: `bun run test`
Expected: PASS, including all pre-existing suites — this task added no changes to `LocalAuthProvider` or any caller.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/supabase/auth/SupabaseAuthProvider.ts src/infrastructure/supabase/auth/SupabaseAuthProvider.contract.test.ts
git commit -m "feat: add SupabaseAuthProvider behind the AuthProvider port"
```

---

### Task 4: Wire `SupabaseAuthProvider` into `container.ts`

**Files:**
- Modify: `src/features/authentication/container.ts`

**Interfaces:**
- Consumes: `SupabaseAuthProvider` (Task 3), `getSupabaseAuthClient` (Task 2), existing `LocalAuthProvider`.
- Produces: `container.authProvider: AuthProvider`, branching on `DATA_ADAPTER` exactly like `buildRepositories()` does today.

- [ ] **Step 1: Add the branch**

In `src/features/authentication/container.ts`, add the import and a `buildAuthProvider` function mirroring the existing `buildRepositories` pattern, then use it in the exported `container` object:

```typescript
import { getSupabaseAuthClient } from "../../infrastructure/supabase/authClient";
import { SupabaseAuthProvider } from "../../infrastructure/supabase/auth/SupabaseAuthProvider";
```

```typescript
function buildAuthProvider() {
  if (process.env["DATA_ADAPTER"] === "supabase") {
    return new SupabaseAuthProvider(getSupabaseAuthClient);
  }
  return new LocalAuthProvider(store, new SystemClock());
}
```

Replace the existing `authProvider: new LocalAuthProvider(store, new SystemClock()),` line in the exported `container` object with `authProvider: buildAuthProvider(),`.

Update the file's top comment (currently: "Supabase adapters will be wired up the same way, behind the same ports, in Phase 9/10, without any feature code changing.") to reflect that auth is now included, e.g. "...Phase 9 (data) and Phase 10 (auth), without any feature code changing."

- [ ] **Step 2: Manually verify both modes boot**

```bash
DATA_ADAPTER=local bun run dev &
sleep 3 && curl -sf http://localhost:3000/sign-in > /dev/null && echo "local mode OK"
kill %1

DATA_ADAPTER=supabase bun run dev &
sleep 3 && curl -sf http://localhost:3000/sign-in > /dev/null && echo "supabase mode OK"
kill %1
```

Expected: both print their "OK" line — the route renders without a server-side throw either way.

- [ ] **Step 3: Commit**

```bash
git add src/features/authentication/container.ts
git commit -m "feat: wire SupabaseAuthProvider behind DATA_ADAPTER"
```

---

### Task 5: Make `requireSession` a real server-side check under Supabase mode

**Files:**
- Modify: `src/features/authentication/guards.ts`
- Modify: `src/features/authentication/SessionContext.tsx` (doc comment only)

**Interfaces:**
- Consumes: `container.authProvider.getSession()` (unchanged signature).
- Produces: `requireSession()` unchanged signature, now actually enforcing server-side when `DATA_ADAPTER=supabase`.

**Why this is safe to change now and not before:** `LocalAuthProvider.getSession()` reads from `BrowserLocalStorageStore`, which has nothing to read on the server — calling it there would incorrectly resolve to "no session" on every SSR pass even for a logged-in user, causing a redirect loop. `SupabaseAuthProvider.getSession()` has no such gap (Task 3's cookie-backed client works identically on server and browser), so the historical `typeof window === "undefined"` bail must now be conditional on the adapter, not unconditional.

- [ ] **Step 1: Update the guard**

```typescript
// src/features/authentication/guards.ts
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
```

- [ ] **Step 2: Update `SessionContext.tsx`'s doc comment**

Find the comment "Runs client-side only — see the 'known limitation' note on the route guard for why." above `SessionProvider` and replace it with: "Runs client-side for the interactive session state (memberships, active-circle switching); `requireSession`/`redirectIfAuthenticated` in guards.ts now also enforce server-side under Supabase mode (Phase 10) — this provider's job is the richer client state, not the initial gate."

- [ ] **Step 3: Manually verify the fix**

With `DATA_ADAPTER=supabase`, sign in, then request `/app` with cookies stripped (e.g. `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/app` with no cookie header) — expect a redirect response (3xx) rather than the protected page's 200.

- [ ] **Step 4: Run the full local suite**

Run: `bun run test`
Expected: PASS — `guards.ts` has no direct unit tests today (it's exercised via `SessionContext.test.tsx` and e2e-style flows); confirm none of those regress.

- [ ] **Step 5: Commit**

```bash
git add src/features/authentication/guards.ts src/features/authentication/SessionContext.tsx
git commit -m "fix: enforce requireSession server-side under supabase mode"
```

---

### Task 6: Adapt the password-reset route to Supabase's recovery-link param

**Files:**
- Modify: `src/routes/reset-password.tsx`

**Interfaces:**
- Consumes: `container.authProvider.resetPassword({ token, newPassword })` (unchanged signature — see Task 3's doc comment on what `token` means per-adapter).

**Why:** Supabase's recovery link (built from the `redirectTo` in Task 3's `requestPasswordReset`) appends `?code=...` (PKCE flow, the `@supabase/ssr` default), not `?token=...`. `LocalAuthProvider` has no such link at all — the reset "token" is only ever handed to a developer/test via `__test__issueResetToken` and manually placed in the URL as `?token=`. Accepting either query key keeps this one route working for both adapters without branching UI code on `DATA_ADAPTER`.

- [ ] **Step 1: Update `validateSearch` and the value it reads**

```typescript
// src/routes/reset-password.tsx
export const Route = createFileRoute("/reset-password")({
  validateSearch: z
    .object({ token: z.string().min(1).optional(), code: z.string().min(1).optional() })
    .refine((v) => v.token ?? v.code, { message: "Missing reset token" }),
  head: () => ({ meta: [{ title: "Reset your password — Umeed" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token, code } = Route.useSearch();
  const resetToken = token ?? code!;
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await container.authProvider.resetPassword({ token: resetToken, newPassword });
    if (!result.ok) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    await refresh();
    navigate({ to: "/app" });
  };

  // ...rest of the component body is unchanged
}
```

- [ ] **Step 2: Run the existing route's relevant tests, if any, and the full suite**

Run: `bun run test`
Expected: PASS. (There is no dedicated `reset-password.tsx` unit test today per the repo inventory — this is a UI route exercised by end-to-end journeys; confirm the type-check step below also passes since `Route.useSearch()`'s shape changed.)

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/reset-password.tsx
git commit -m "fix: accept supabase's code param on the reset-password route"
```

---

### Task 7: Realtime alert updates

**Files:**
- Create: `src/features/alerts/useAlertsRealtime.ts`
- Test: `src/features/alerts/useAlertsRealtime.test.tsx`
- Modify: `src/routes/app.alerts.tsx`
- Modify: `src/routes/app.index.tsx`

**Interfaces:**
- Consumes: `getSupabaseAuthClient` — reused here for its browser singleton (Realtime needs a `SupabaseClient`, and the browser auth client already holds the right anon-key connection; no second client is created).
- Produces: `useAlertsRealtime(circleId: string | undefined, onChange: () => void): void` — a hook with no return value; call sites already have their own refetch function (`load` in `app.alerts.tsx`, extracted below in `app.index.tsx`) to pass as `onChange`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/alerts/useAlertsRealtime.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAlertsRealtime } from "./useAlertsRealtime";

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};
const mockClient = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock("@/infrastructure/supabase/authClient", () => ({
  getSupabaseAuthClient: () => mockClient,
}));

describe("useAlertsRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["DATA_ADAPTER"] = "supabase";
  });

  it("does nothing when there is no active circle", () => {
    renderHook(() => useAlertsRealtime(undefined, vi.fn()));
    expect(mockClient.channel).not.toHaveBeenCalled();
  });

  it("does nothing in local mode even with a circle id", () => {
    process.env["DATA_ADAPTER"] = "local";
    renderHook(() => useAlertsRealtime("circle-1", vi.fn()));
    expect(mockClient.channel).not.toHaveBeenCalled();
  });

  it("subscribes to the circle's alerts channel and wires onChange to postgres_changes", () => {
    const onChange = vi.fn();
    renderHook(() => useAlertsRealtime("circle-1", onChange));

    expect(mockClient.channel).toHaveBeenCalledWith("alerts:circle-1");
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "alerts",
        filter: "care_circle_id=eq.circle-1",
      }),
      expect.any(Function),
    );

    const changeHandler = mockChannel.on.mock.calls[0][2];
    changeHandler();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() => useAlertsRealtime("circle-1", vi.fn()));
    unmount();
    expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run src/features/alerts/useAlertsRealtime.test.tsx`
Expected: FAIL — `useAlertsRealtime.ts` does not exist yet.

- [ ] **Step 3: Implement the hook**

```typescript
// src/features/alerts/useAlertsRealtime.ts
import { useEffect } from "react";
import { getSupabaseAuthClient } from "@/infrastructure/supabase/authClient";

/**
 * Subscribes to live changes on `alerts` for one care circle (Implementation.md
 * §11.1 EventBus / Phase 10 design doc §4: Realtime scope is alerts only).
 * On any change, calls onChange so the caller re-fetches through its normal
 * use case — Realtime here is purely the "something changed, refetch"
 * signal, never a second source of truth for alert state. A no-op outside
 * Supabase mode, since the local adapter has no Realtime equivalent (its
 * screens already poll on their own effects).
 */
export function useAlertsRealtime(circleId: string | undefined, onChange: () => void): void {
  useEffect(() => {
    if (!circleId) return;
    if (process.env["DATA_ADAPTER"] !== "supabase") return;

    const client = getSupabaseAuthClient();
    const channel = client
      .channel(`alerts:${circleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `care_circle_id=eq.${circleId}` },
        () => onChange(),
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run vitest run src/features/alerts/useAlertsRealtime.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire into `app.alerts.tsx`**

Add the import and call it alongside the existing `load` effect:

```typescript
import { useAlertsRealtime } from "@/features/alerts/useAlertsRealtime";
```

```typescript
useAlertsRealtime(circleId, load);
```

Place this call directly after the existing `useEffect(() => { void load(); ... }, [circleId]);` block.

- [ ] **Step 6: Wire into `app.index.tsx`**

Extract the inline fetch logic in the existing `useEffect` into a named `refresh` function so both the mount effect and the realtime hook can call it:

```typescript
useEffect(() => {
  const circleId = resolveActiveMembership(memberships, activeCircleId)?.circle.id;
  if (!circleId) return;

  const refresh = () => {
    void getRecentActivity(
      { audit: container.auditRepository },
      { careCircleId: circleId, limit: 5 },
    ).then(setActivity);
    void getAlertsForCircle(
      {
        alerts: container.alertRepository,
        careCircles: container.careCircleRepository,
        profiles: container.profileRepository,
      },
      { careCircleId: circleId },
    ).then((all) =>
      setOpenAlerts(all.filter((a) => !["resolved", "unresolved", "cancelled"].includes(a.status))),
    );
  };

  refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [memberships, activeCircleId]);

useAlertsRealtime(resolveActiveMembership(memberships, activeCircleId)?.circle.id, () => {
  const circleId = resolveActiveMembership(memberships, activeCircleId)?.circle.id;
  if (!circleId) return;
  void getRecentActivity(
    { audit: container.auditRepository },
    { careCircleId: circleId, limit: 5 },
  ).then(setActivity);
  void getAlertsForCircle(
    {
      alerts: container.alertRepository,
      careCircles: container.careCircleRepository,
      profiles: container.profileRepository,
    },
    { careCircleId: circleId },
  ).then((all) =>
    setOpenAlerts(all.filter((a) => !["resolved", "unresolved", "cancelled"].includes(a.status))),
  );
});
```

(This duplicates `refresh`'s body across the two closures because `refresh` is scoped inside the first effect; if this feels wrong when you're in the file, lift `refresh` to component-body scope with `useCallback` instead — same behavior, cleaner. Either is acceptable; the test in Step 1 only covers the hook itself, not this call site.)

- [ ] **Step 7: Run the full local suite**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 8: Manual two-tab verification (the Phase 10 acceptance criterion)**

With `DATA_ADAPTER=supabase`: open `/app/alerts` for the same circle in two browser tabs signed in as different circle members. Trigger an alert (e.g. via the existing direct-help flow), claim it from one tab, and confirm the second tab's alert list updates without a manual refresh.

- [ ] **Step 9: Commit**

```bash
git add src/features/alerts/useAlertsRealtime.ts src/features/alerts/useAlertsRealtime.test.tsx src/routes/app.alerts.tsx src/routes/app.index.tsx
git commit -m "feat: live-update alerts via supabase realtime"
```

---

### Task 8: Enable `pg_cron` and `pg_net`

**Files:**
- Create: `supabase/migrations/<timestamp>_enable_cron_extensions.sql`

**Interfaces:**
- Produces: the `pg_cron` and `pg_net` extensions available in the `umeed` project, consumed by Task 10's schedule.

- [ ] **Step 1: Generate the migration file**

```bash
supabase migration new enable_cron_extensions
```

- [ ] **Step 2: Write the migration**

```sql
-- Enables scheduled, server-side occurrence generation and escalation
-- processing (Implementation.md §11.5, Phase 10 design doc §5): pg_cron
-- fires on a fixed interval, pg_net lets that cron job call an HTTPS Edge
-- Function rather than running SQL logic directly.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

- [ ] **Step 3: Apply it**

```bash
supabase migration up --linked --password "$SUPABASE_DB_PASSWORD"
```

Expected: command reports the new migration applied with no errors.

- [ ] **Step 4: Verify**

```bash
supabase migration list --password "$SUPABASE_DB_PASSWORD"
```

Expected: the new migration's timestamp appears under both `local` and `remote`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_enable_cron_extensions.sql
git commit -m "feat: enable pg_cron and pg_net extensions"
```

---

### Task 9: Add `findAllActive` to `CareCircleRepository`

The Edge Function in Task 10 needs to enumerate every active care circle to poll — no existing `CareCircleRepository` method does this (`findByUserId` only returns one user's circles). Add it to the port and both adapters now, with contract coverage, before writing the function that depends on it.

**Files:**
- Modify: `src/application/ports/repositories.ts`
- Modify: `src/infrastructure/local/repositories/LocalCareCircleRepository.ts`
- Modify: `src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts`
- Modify: `test/contracts/repositoryContract.ts`

**Interfaces:**
- Produces: `CareCircleRepository.findAllActive(): Promise<CareCircle[]>`, consumed by Task 10's Edge Function.

- [ ] **Step 1: Write the failing contract test**

In `test/contracts/repositoryContract.ts`, inside `runCareCircleRepositoryContract`, add:

```typescript
it("findAllActive returns only circles with status active", async () => {
  const repo = makeRepository();
  await repo.save(buildCareCircle({ id: "c-1", status: "active" }));
  await repo.save(buildCareCircle({ id: "c-2", status: "paused" }));
  await repo.save(buildCareCircle({ id: "c-3", status: "active" }));
  const circles = await repo.findAllActive();
  expect(circles.map((c) => c.id).sort()).toEqual(["c-1", "c-3"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run test/contracts/localRepositories.contract.test.ts`
Expected: FAIL with a type error / "findAllActive is not a function" — the port doesn't declare it yet.

- [ ] **Step 3: Add the method to the port and both adapters**

In `src/application/ports/repositories.ts`, add to `CareCircleRepository`:

```typescript
  findAllActive(): Promise<CareCircle[]>;
```

In `src/infrastructure/local/repositories/LocalCareCircleRepository.ts`, add:

```typescript
  async findAllActive(): Promise<CareCircle[]> {
    return this.circles.all().filter((c) => c.status === "active");
  }
```

In `src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts`, add:

```typescript
  async findAllActive(): Promise<CareCircle[]> {
    const { data, error } = await this.client
      .from("care_circles")
      .select("*")
      .eq("status", "active")
      .returns<CareCircleRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToCareCircle);
  }
```

- [ ] **Step 4: Run both contract suites to verify they pass**

Run: `bun run vitest run test/contracts/localRepositories.contract.test.ts`
Expected: PASS.

Run: `set -a && source .env.local && set +a && bun run vitest run test/contracts/supabaseRepositories.contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/ports/repositories.ts src/infrastructure/local/repositories/LocalCareCircleRepository.ts src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts test/contracts/repositoryContract.ts
git commit -m "feat: add findAllActive to CareCircleRepository"
```

---

### Task 10: `poll-due-work` Edge Function + cron schedule

**Files:**
- Create: `supabase/functions/poll-due-work/index.ts`
- Create: `supabase/migrations/<timestamp>_schedule_poll_due_work.sql`
- Test: `test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts`

**Interfaces:**
- Consumes: the existing `pollDueWork` use case (`src/application/use-cases/pollDueWork.ts`), `CareCircleRepository.findAllActive()` (Task 9), and the existing Supabase repository adapters — the Edge Function is a thin Deno wrapper that builds the same `PollDueWorkDeps` shape `LocalScheduler` builds today (see `src/routes/app.tsx`'s `AppLayout` effect for the exact deps list), just backed by Supabase repos instead of local ones.
- Produces: an HTTPS endpoint at `<SUPABASE_URL>/functions/v1/poll-due-work` that pg_cron invokes on a schedule; returns `PollDueWorkResult` as JSON for observability.

- [ ] **Step 1: Write the failing integration test**

This hits the deployed function directly (skipped without credentials, matching every other Supabase suite), asserting idempotency — the concrete, checkable half of the acceptance criterion "scheduled jobs are idempotent."

```typescript
// test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts
import { describe, expect, it } from "vitest";

const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) && Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);

async function invoke(): Promise<{ occurrencesGenerated: number; alertsRaised: number; claimsReleased: number }> {
  const response = await fetch(`${process.env["SUPABASE_URL"]}/functions/v1/poll-due-work`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env["SUPABASE_SERVICE_ROLE_KEY"]}` },
  });
  if (!response.ok) throw new Error(`poll-due-work returned ${response.status}`);
  return response.json();
}

describe.skipIf(!hasSupabaseEnv)("poll-due-work Edge Function", () => {
  it("running twice back-to-back does not double-generate occurrences", async () => {
    const first = await invoke();
    const second = await invoke();
    // The second call sees the same due state the first call just resolved
    // — nothing new should be due a few hundred milliseconds later.
    expect(second.occurrencesGenerated).toBe(0);
    expect(second.alertsRaised).toBe(0);
    void first;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts`
Expected: FAIL — the function isn't deployed yet (fetch will fail or 404).

- [ ] **Step 3: Write the Edge Function**

```typescript
// supabase/functions/poll-due-work/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { pollDueWork } from "../../../src/application/use-cases/pollDueWork.ts";
import { SystemClock } from "../../../src/shared/time/Clock.ts";
import { UuidIdGenerator } from "../../../src/shared/id/IdGenerator.ts";
import { SupabaseRoutineRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseRoutineRepository.ts";
import { SupabaseOccurrenceRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseOccurrenceRepository.ts";
import { SupabaseCareCircleRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts";
import { SupabaseAlertRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseAlertRepository.ts";
import { SupabaseAuditRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseAuditRepository.ts";
import { SupabaseCommunicationRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseCommunicationRepository.ts";
import { MockNotificationGateway } from "../../../src/infrastructure/mock-communications/MockNotificationGateway.ts";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const careCircles = new SupabaseCareCircleRepository(client);
  const deps = {
    routines: new SupabaseRoutineRepository(client),
    occurrences: new SupabaseOccurrenceRepository(client),
    careCircles,
    alerts: new SupabaseAlertRepository(client),
    audit: new SupabaseAuditRepository(client),
    communications: new SupabaseCommunicationRepository(client),
    notificationGateway: new MockNotificationGateway(clock, idGenerator),
    clock,
    idGenerator,
  };

  try {
    const activeCircles = await careCircles.findAllActive();
    const result = await pollDueWork(deps, { careCircleIds: activeCircles.map((c) => c.id) });
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    // Redacted the same way analytics events already are (Implementation.md
    // §15): log the error's message/stack only, never the full care-circle
    // or occurrence payload it might have been operating on when it threw.
    console.error("poll-due-work failed:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
```

Note: Supabase Edge Functions run on Deno and cannot import TypeScript written against Node/browser assumptions without checking compatibility first — before wiring the full import list above, run `supabase functions serve poll-due-work` locally and fix any import that doesn't resolve under Deno (most likely candidates: anything importing `zod` — confirm the version in use publishes an ESM build Deno's `npm:` specifier resolves, adjusting the affected imports to `npm:zod@<version>` specifiers if needed).

- [ ] **Step 4: Deploy the function**

```bash
supabase functions deploy poll-due-work --project-ref focqwbtnltixlzfvovcn
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run vitest run test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts`
Expected: PASS.

- [ ] **Step 6: Schedule it with pg_cron**

```sql
-- supabase/migrations/<timestamp>_schedule_poll_due_work.sql
-- Runs poll-due-work every minute (Implementation.md §11.5's "short
-- interval" guidance for the scheduler this replaces server-side). The
-- service-role key used here is a Postgres secret set via
-- `supabase secrets set`, never committed to this file.
select cron.schedule(
  'poll-due-work-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/poll-due-work',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

Before applying, set the two settings this migration reads:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" --project-ref focqwbtnltixlzfvovcn
```

and, in the SQL editor (one-time, project-level config, not a migration since it embeds this project's own URL):

```sql
alter database postgres set app.settings.supabase_url = 'https://focqwbtnltixlzfvovcn.supabase.co';
alter database postgres set app.settings.service_role_key = '<the service role key>';
```

- [ ] **Step 7: Apply the migration**

```bash
supabase migration up --linked --password "$SUPABASE_DB_PASSWORD"
```

- [ ] **Step 8: Verify the cron job runs**

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
```

Expected: `poll-due-work-every-minute` listed, and recent successful runs appearing within a couple of minutes.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/poll-due-work/index.ts supabase/migrations/*_schedule_poll_due_work.sql test/infrastructure/supabase/pollDueWorkFunction.contract.test.ts
git commit -m "feat: schedule poll-due-work via pg_cron and an edge function"
```

---

### Task 11: Cutover, docs, and final verification

**Files:**
- Modify: `.env.local` (not committed — gitignored)
- Modify: `README.md`
- Modify: `Implementation.md` (checklist)

**Interfaces:** None new — this task verifies everything above works together and records it.

- [ ] **Step 1: Flip local usage to Supabase mode**

In `.env.local`:

```
DATA_ADAPTER=supabase
COMMUNICATION_ADAPTER=mock
```

(`COMMUNICATION_ADAPTER` stays `mock` — Twilio is Phase 11, out of scope here.)

- [ ] **Step 2: Run the full local automated suite with zero Supabase requirement**

```bash
env -u SUPABASE_URL -u SUPABASE_ANON_KEY -u SUPABASE_SERVICE_ROLE_KEY bun run test
```

Expected: PASS — every local/unit test and Supabase contract test (which self-skips) passes with no Supabase credentials present, confirming the release-gate rule from Phase 8 still holds.

- [ ] **Step 3: Run the full suite again with Supabase credentials present**

```bash
set -a && source .env.local && set +a && bun run test
```

Expected: PASS, now including all the Supabase-dependent contract tests (repositories, RLS, auth, poll-due-work).

- [ ] **Step 4: Manual end-to-end smoke test against the live project**

Run `bun run dev` with `DATA_ADAPTER=supabase`, and walk: sign up → onboarding → invite a second account → accept invite → create a routine → trigger the missed-routine path → claim from a second tab → resolve. Confirm each step matches the equivalent local-mode journey with no console errors.

- [ ] **Step 5: Update `README.md`**

Add a "Running against Supabase" subsection near the existing "Fixture accounts" section, documenting: how to set `DATA_ADAPTER=supabase`, that email confirmation is disabled for this project (linking back to the Global Constraints note above), and how to point at a different Supabase project if someone forks this repo.

- [ ] **Step 6: Update `Implementation.md`'s checklist**

```markdown
- [x] Phase 10 — Supabase cutover and server scheduling
```

- [ ] **Step 7: Commit**

```bash
git add README.md Implementation.md
git commit -m "docs: complete phase 10 supabase cutover"
```

