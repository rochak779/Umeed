/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Deliberately independent of vite.config.ts: that file pulls in the
// TanStack Start / Nitro SSR toolchain via @lovable.dev/vite-tanstack-config,
// which is unnecessary (and conflicts with) plain unit/contract test runs.
// Domain code under test has no framework dependency, so this config only
// needs the @ path alias.
export default defineConfig(({ mode }) => {
  // `bun run test` / `bun run vitest ...` does not auto-load .env.local
  // into the vitest subprocess's process.env (unlike `bun run <file>.ts`
  // or `bun -e`, that auto-loading only applies to files bun executes
  // directly, not to package.json scripts). The Supabase contract tests
  // (test/contracts/supabaseRepositories.contract.test.ts) need
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at import time, so pull them
  // in via Vite's own env loader (empty prefix = load every var, not just
  // VITE_*-prefixed ones) and copy them onto process.env for Node code.
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
    },
  };
});
