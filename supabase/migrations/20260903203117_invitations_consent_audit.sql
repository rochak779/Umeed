create table invitations (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  invited_by_user_id text not null references profiles(id),
  invited_email text,
  invited_phone text,
  proposed_responder_type text not null check (proposed_responder_type in ('older_adult','family','nearby_responder','coordinator')),
  proposed_relationship text not null,
  token_hash text not null,
  status text not null check (status in ('pending','accepted','declined','expired','revoked')),
  expires_at timestamptz not null,
  accepted_by_user_id text references profiles(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_contact_required check (invited_email is not null or invited_phone is not null)
);
create unique index invitations_token_hash_idx on invitations (token_hash);
create index invitations_care_circle_idx on invitations (care_circle_id);

create table consent_records (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  subject_user_id text not null references profiles(id),
  consent_type text not null check (consent_type in ('circle_participation','share_address_with_nearby_responder','automated_calls_enabled','data_retention')),
  policy_version text not null,
  status text not null check (status in ('granted','revoked')),
  granted_at timestamptz,
  revoked_at timestamptz,
  recorded_by text not null references profiles(id)
);
create index consent_records_circle_idx on consent_records (care_circle_id);

create table notification_preferences (
  id text primary key,
  user_id text not null references profiles(id),
  care_circle_id text not null references care_circles(id) on delete cascade,
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  enabled boolean not null default true,
  quiet_hours_start text check (quiet_hours_start ~ '^\d{2}:\d{2}$'),
  quiet_hours_end text check (quiet_hours_end ~ '^\d{2}:\d{2}$'),
  timezone text not null,
  urgent_alerts_override_quiet_hours boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index notification_preferences_user_circle_channel_idx
  on notification_preferences (user_id, care_circle_id, channel);
create trigger notification_preferences_set_updated_at before update on notification_preferences
  for each row execute function set_updated_at();

-- Append-only: no UPDATE/DELETE grants at the table-privilege level. The
-- service role still bypasses privileges, so the Supabase adapter itself
-- must additionally guard re-inserting an existing id (see Task 10).
create table audit_events (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  actor_id text not null references profiles(id),
  actor_type text not null check (actor_type in ('user','system')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  "timestamp" timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index audit_events_circle_idx on audit_events (care_circle_id);
revoke update, delete on audit_events from authenticated, anon;
