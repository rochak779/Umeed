-- Enables scheduled, server-side occurrence generation and escalation
-- processing (Implementation.md §11.5, Phase 10 design doc §5): pg_cron
-- fires on a fixed interval, pg_net lets that cron job call an HTTPS Edge
-- Function rather than running SQL logic directly.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
