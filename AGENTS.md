<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

> [!IMPORTANT]
> The database is a Supabase project shared with other hobby apps. Umeed owns
> only the `umeed` schema. Follow `docs/shared-supabase-db.md`: apply
> migrations with `bun run db:migrate`, and never run `supabase db push`,
> `supabase db reset --linked` or `supabase link` against it.
> Never create or change anything in `public` or another app's schema. Every
> Supabase client must pass `db: { schema: "umeed" }` (use
> `SUPABASE_DB_SCHEMA` from `src/infrastructure/supabase/schema.ts`), and
> edge functions, cron jobs, Vault secrets and buckets are prefixed `umeed-`/`umeed_`.
