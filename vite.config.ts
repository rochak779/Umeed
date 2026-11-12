import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  server: { port: 8080 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps the default entry with an SSR error page.
      server: { entry: "server" },
      // Server-only code (service-role client, actor checks) must never
      // reach the browser bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Nitro picks its output target from the environment: Vercel's when
    // building on Vercel, a Node server locally.
    ...(command === "build" ? [nitro()] : []),
    viteReact(),
  ],
}));
