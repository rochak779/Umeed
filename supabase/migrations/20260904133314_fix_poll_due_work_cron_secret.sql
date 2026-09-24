-- Corrects 20260904130023_schedule_poll_due_work.sql: `alter database
-- postgres set app.settings.*` is not permitted on hosted Supabase (custom
-- GUCs require superuser privileges the pooler connection role does not
-- have), discovered when applying that setting live. Supabase's supported
-- alternative for secrets referenced from SQL/pg_cron is Vault
-- (https://supabase.com/docs/guides/database/vault) — a secret named
-- 'umeed_poll_due_work_invoke_secret' was created there directly (one-time,
-- outside migrations, via `select vault.create_secret(...)`, never
-- committed to this file). The Supabase project URL is not secret, so it's
-- inlined directly rather than round-tripped through Vault.
--
-- cron.schedule() upserts by job name, so re-calling it with the same name
-- ('umeed-poll-due-work') replaces the previous (non-working)
-- command rather than creating a duplicate job.
select cron.schedule(
  'umeed-poll-due-work',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://aqvpdfdfsterpdumjglx.supabase.co/functions/v1/umeed-poll-due-work',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'umeed_poll_due_work_invoke_secret'
      )
    )
  );
  $$
);
