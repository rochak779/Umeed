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
