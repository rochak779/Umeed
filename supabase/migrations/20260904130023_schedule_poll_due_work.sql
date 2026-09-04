-- Runs poll-due-work every minute (Implementation.md §11.5's "short
-- interval" guidance for the scheduler this replaces server-side). The
-- bearer token sent here is a custom invoke secret (POLL_DUE_WORK_INVOKE_SECRET
-- in the function, app.settings.poll_due_work_invoke_secret here) — a
-- Postgres setting populated by a one-time `alter database` statement run
-- outside migrations, never committed to this file. It is deliberately not
-- the Supabase-managed service-role key: that key's format is controlled by
-- Supabase's own runtime and is not guaranteed to match what this function
-- expects for caller authentication.
select cron.schedule(
  'poll-due-work-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/poll-due-work',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.poll_due_work_invoke_secret')
    )
  );
  $$
);
