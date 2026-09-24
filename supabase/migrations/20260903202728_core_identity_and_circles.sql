-- Shared trigger function: keeps updated_at current on every UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table profiles (
  id text primary key,
  display_name text not null,
  preferred_name text not null,
  phone text,
  address text,
  email text not null,
  timezone text not null,
  locale text not null,
  accessibility_large_text boolean not null default false,
  accessibility_reduced_motion boolean not null default false,
  accessibility_high_contrast boolean not null default false,
  onboarding_status text not null check (onboarding_status in ('not_started','in_progress','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_idx on profiles (lower(email));
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

create table care_circles (
  id text primary key,
  name text not null,
  older_adult_id text references profiles(id),
  coordinator_id text not null references profiles(id),
  status text not null check (status in ('draft','pending_consent','active','paused','closed','deleted_pending_retention')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_circles_older_adult_idx on care_circles (older_adult_id);
create index care_circles_coordinator_idx on care_circles (coordinator_id);
create trigger care_circles_set_updated_at before update on care_circles
  for each row execute function set_updated_at();

create table circle_members (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  user_id text not null references profiles(id),
  relationship text not null,
  responder_type text not null check (responder_type in ('older_adult','family','nearby_responder','coordinator')),
  is_nearby boolean not null default false,
  priority integer not null check (priority >= 0),
  availability_days_of_week integer[],
  availability_start_local_time text check (availability_start_local_time ~ '^\d{2}:\d{2}$'),
  availability_end_local_time text check (availability_end_local_time ~ '^\d{2}:\d{2}$'),
  preferred_channel text not null check (preferred_channel in ('in_app','push','sms','voice','email')),
  membership_status text not null check (membership_status in ('invited','active','declined','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index circle_members_circle_idx on circle_members (care_circle_id);
create index circle_members_user_idx on circle_members (user_id);
create unique index circle_members_circle_user_idx on circle_members (care_circle_id, user_id);
create trigger circle_members_set_updated_at before update on circle_members
  for each row execute function set_updated_at();

create table member_permissions (
  id text primary key,
  circle_member_id text not null unique references circle_members(id) on delete cascade,
  can_view_routine_status boolean not null default false,
  can_view_routine_names boolean not null default false,
  can_view_medication_labels boolean not null default false,
  can_view_notes boolean not null default false,
  can_view_address boolean not null default false,
  can_receive_alerts boolean not null default false,
  can_manage_routines boolean not null default false,
  can_manage_circle boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
