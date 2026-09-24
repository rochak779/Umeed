create table routines (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  older_adult_id text not null references profiles(id),
  type text not null check (type in ('general_checkin','medication','meal','hydration','appointment_prep','movement','custom')),
  title text not null,
  description text,
  timezone text not null,
  local_time text not null check (local_time ~ '^\d{2}:\d{2}$'),
  days_of_week integer[] not null,
  start_date date not null,
  end_date date,
  grace_period_minutes integer not null check (grace_period_minutes >= 0),
  visibility text not null check (visibility in ('family_and_nearby','family_only','coordinator_only')),
  enabled boolean not null default true,
  notification_channels text[] not null,
  created_by text not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_circle_idx on routines (care_circle_id);
create trigger routines_set_updated_at before update on routines
  for each row execute function set_updated_at();

create table escalation_policies (
  id text primary key,
  routine_id text not null unique references routines(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  steps jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger escalation_policies_set_updated_at before update on escalation_policies
  for each row execute function set_updated_at();

create table occurrences (
  id text primary key,
  routine_id text not null references routines(id) on delete cascade,
  scheduled_for_utc timestamptz not null,
  scheduled_local_date date not null,
  status text not null check (status in ('scheduled','awaiting_response','acknowledged','missed','escalating','resolved','cancelled')),
  acknowledged_at timestamptz,
  acknowledged_by text references profiles(id),
  acknowledgement_channel text check (acknowledgement_channel in ('in_app','voice_keypad','sms')),
  alert_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index occurrences_routine_scheduled_idx on occurrences (routine_id, scheduled_for_utc);
create index occurrences_due_idx on occurrences (scheduled_for_utc, status);
create trigger occurrences_set_updated_at before update on occurrences
  for each row execute function set_updated_at();
