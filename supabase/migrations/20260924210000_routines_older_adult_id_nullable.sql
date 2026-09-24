-- A coordinator may set up routines before the older adult has accepted the
-- invitation (Implementation.md §7.3 step 9), when no profile exists yet for
-- her. older_adult_id stays null until acceptInvitation fills it in.
alter table routines alter column older_adult_id drop not null;
