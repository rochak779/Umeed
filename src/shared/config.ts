/**
 * The one place that reads adapter mode and public Supabase settings.
 *
 * Server code sees `process.env`; browser code only sees `import.meta.env.VITE_*`
 * (Vite inlines those at build time). Reading a bare `process.env` in the
 * browser silently yields `undefined`, which is how the app used to fall back
 * to localStorage after hydration — so nothing else should read these directly.
 */
type Env = Record<string, string | undefined>;

export type ConfigSources = { processEnv?: Env | undefined; viteEnv?: Env | undefined };

function defaultSources(): ConfigSources {
  return {
    processEnv: typeof process !== "undefined" ? process.env : undefined,
    viteEnv: {
      VITE_DATA_ADAPTER: import.meta.env.VITE_DATA_ADAPTER,
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  };
}

function read(sources: ConfigSources, name: string): string | undefined {
  const { processEnv, viteEnv } = sources;
  return (
    processEnv?.[name] || processEnv?.[`VITE_${name}`] || viteEnv?.[`VITE_${name}`] || undefined
  );
}

/**
 * Mode is decided at build time by VITE_DATA_ADAPTER, which Vite inlines
 * into both the server and the browser bundles — so the two can never
 * disagree. A server-side DATA_ADAPTER is only checked, never trusted: if it
 * says something different, fail loudly instead of running a Supabase-mode
 * server behind a local-mode browser.
 */
export function isSupabaseMode(sources: ConfigSources = defaultSources()): boolean {
  const buildMode = sources.viteEnv?.["VITE_DATA_ADAPTER"] === "supabase" ? "supabase" : "local";
  const serverSetting = sources.processEnv?.["DATA_ADAPTER"];
  if (serverSetting) {
    const serverMode = serverSetting === "supabase" ? "supabase" : "local";
    if (serverMode !== buildMode) {
      throw new Error(
        `DATA_ADAPTER=${serverSetting} but this build was made with VITE_DATA_ADAPTER=${
          sources.viteEnv?.["VITE_DATA_ADAPTER"] ?? "(unset)"
        }. Set VITE_DATA_ADAPTER (it decides the mode for both server and browser) and rebuild.`,
      );
    }
  }
  return buildMode === "supabase";
}

export function publicSupabaseConfig(sources: ConfigSources = defaultSources()): {
  url: string;
  anonKey: string;
} {
  const url = read(sources, "SUPABASE_URL");
  const anonKey = read(sources, "SUPABASE_ANON_KEY");
  if (!url)
    throw new Error(
      "Missing required environment variable SUPABASE_URL (or VITE_SUPABASE_URL in the browser).",
    );
  if (!anonKey)
    throw new Error(
      "Missing required environment variable SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY in the browser).",
    );
  return { url, anonKey };
}
