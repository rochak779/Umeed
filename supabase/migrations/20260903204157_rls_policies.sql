-- True if the calling JWT's user is an active member of the given circle.
create or replace function is_active_circle_member(p_circle_id text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from circle_members
    where care_circle_id = p_circle_id
      and user_id = auth.uid()::text
      and membership_status = 'active'
  );
$$;

alter table profiles enable row level security;
alter table care_circles enable row level security;
alter table circle_members enable row level security;
alter table member_permissions enable row level security;
alter table invitations enable row level security;
alter table consent_records enable row level security;
alter table notification_preferences enable row level security;
alter table audit_events enable row level security;
alter table routines enable row level security;
alter table escalation_policies enable row level security;
alter table occurrences enable row level security;
alter table alerts enable row level security;
alter table alert_recipients enable row level security;
alter table communication_events enable row level security;

-- profiles: a user can read their own row and the profile of anyone who
-- shares an active circle with them (needed to render names in the UI).
create policy profiles_select on profiles for select
  using (
    id = auth.uid()::text
    or exists (
      select 1 from circle_members me
      join circle_members them on them.care_circle_id = me.care_circle_id
      where me.user_id = auth.uid()::text and me.membership_status = 'active'
        and them.user_id = profiles.id and them.membership_status = 'active'
    )
  );
create policy profiles_update_self on profiles for update
  using (id = auth.uid()::text);

create policy care_circles_select on care_circles for select
  using (is_active_circle_member(id));

create policy circle_members_select on circle_members for select
  using (is_active_circle_member(care_circle_id));

-- member_permissions: nearby responders must not read medication/notes
-- columns. Row-level RLS can't hide individual columns, so the sensitive
-- fields are additionally redacted application-side in the repository
-- mapper (Task 10) using this same permission row; RLS here only scopes
-- *which rows* (i.e. which circle) are visible at all.
create policy member_permissions_select on member_permissions for select
  using (
    exists (
      select 1 from circle_members cm
      where cm.id = member_permissions.circle_member_id
        and is_active_circle_member(cm.care_circle_id)
    )
  );

create policy invitations_select on invitations for select
  using (is_active_circle_member(care_circle_id));

create policy consent_records_select on consent_records for select
  using (is_active_circle_member(care_circle_id));

create policy notification_preferences_select on notification_preferences for select
  using (user_id = auth.uid()::text);
create policy notification_preferences_modify on notification_preferences for all
  using (user_id = auth.uid()::text);

create policy audit_events_select on audit_events for select
  using (is_active_circle_member(care_circle_id));
-- No insert/update/delete policy for authenticated/anon: audit_events is
-- written only by the service role (server-side use cases), matching
-- "service-role operations are restricted to backend functions."

create policy routines_select on routines for select
  using (is_active_circle_member(care_circle_id));

create policy escalation_policies_select on escalation_policies for select
  using (
    exists (
      select 1 from routines r
      where r.id = escalation_policies.routine_id
        and is_active_circle_member(r.care_circle_id)
    )
  );

create policy occurrences_select on occurrences for select
  using (
    exists (
      select 1 from routines r
      where r.id = occurrences.routine_id
        and is_active_circle_member(r.care_circle_id)
    )
  );

create policy alerts_select on alerts for select
  using (is_active_circle_member(care_circle_id));

create policy alert_recipients_select on alert_recipients for select
  using (
    exists (
      select 1 from alerts a
      where a.id = alert_recipients.alert_id
        and is_active_circle_member(a.care_circle_id)
    )
  );

create policy communication_events_select on communication_events for select
  using (
    exists (
      select 1 from alerts a
      where a.id = communication_events.alert_id
        and is_active_circle_member(a.care_circle_id)
    )
  );
