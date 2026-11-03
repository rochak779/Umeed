-- Live alert updates (useAlertsRealtime subscribes to umeed.alerts). The
-- supabase_realtime publication is shared by every app in this project, so
-- this adds only Umeed's own schema-qualified table and is a no-op if it is
-- already there (docs/shared-supabase-db.md §2). Subscribers only receive
-- rows the alerts_select RLS policy lets them read.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'umeed' and tablename = 'alerts'
  ) then
    alter publication supabase_realtime add table umeed.alerts;
  end if;
end
$$;
