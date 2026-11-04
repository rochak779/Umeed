// Browser-visible settings read by src/shared/config.ts. Declared so they
// can be read with dot access, which is what Vite inlines at build time.
interface ImportMetaEnv {
  readonly VITE_DATA_ADAPTER?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
