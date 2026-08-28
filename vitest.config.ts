/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Deliberately independent of vite.config.ts: that file pulls in the
// TanStack Start / Nitro SSR toolchain via @lovable.dev/vite-tanstack-config,
// which is unnecessary (and conflicts with) plain unit/contract test runs.
// Domain code under test has no framework dependency, so this config only
// needs the @ path alias.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
  },
});
