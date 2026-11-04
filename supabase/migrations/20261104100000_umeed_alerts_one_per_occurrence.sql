-- At most one alert per routine occurrence. raiseMissedRoutineAlert reads
-- then writes, so two overlapping runs of umeed-poll-due-work could both
-- open an alert for the same missed occurrence; with this index the second
-- insert fails and pollDueWork counts it as an error and moves on. Direct
-- help alerts have no occurrence and are unaffected.
create unique index if not exists alerts_occurrence_id_unique_idx
  on umeed.alerts (occurrence_id)
  where occurrence_id is not null;
