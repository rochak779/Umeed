create table alerts (
  id text primary key,
  care_circle_id text not null references care_circles(id) on delete cascade,
  occurrence_id text references occurrences(id),
  source text not null check (source in ('missed_routine','direct_help','manual')),
  status text not null check (status in ('open','notifying','unclaimed','claimed','resolved','unresolved','cancelled')),
  severity text not null check (severity in ('routine','urgent')),
  current_stage integer not null default 0 check (current_stage >= 0),
  opened_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text references profiles(id),
  claim_expires_at timestamptz,
  resolved_at timestamptz,
  resolved_by text references profiles(id),
  resolution_code text check (resolution_code in ('spoke_all_okay','checked_in_person_all_okay','older_adult_asked_for_family','professional_assistance_contacted','unable_to_reach','false_or_accidental','other')),
  resolution_note text,
  updated_at timestamptz not null default now()
);
create index alerts_circle_idx on alerts (care_circle_id);
create index alerts_status_idx on alerts (status);
create trigger alerts_set_updated_at before update on alerts
  for each row execute function set_updated_at();

alter table occurrences add constraint occurrences_alert_fk
  foreign key (alert_id) references alerts(id);

create table alert_recipients (
  id text primary key,
  alert_id text not null references alerts(id) on delete cascade,
  circle_member_id text not null references circle_members(id),
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  stage integer not null check (stage >= 0),
  delivery_status text not null check (delivery_status in ('queued','sent','delivered','failed','accepted','declined')),
  provider_reference text,
  sent_at timestamptz,
  delivered_at timestamptz,
  responded_at timestamptz,
  response text
);
create index alert_recipients_alert_idx on alert_recipients (alert_id);

create table communication_events (
  id text primary key,
  alert_id text references alerts(id),
  occurrence_id text references occurrences(id),
  recipient_id text not null references circle_members(id),
  channel text not null check (channel in ('in_app','push','sms','voice','email')),
  direction text not null check (direction in ('outbound','inbound')),
  provider_reference text,
  status text not null check (status in ('queued','sent','delivered','failed','accepted','declined')),
  attempt_number integer not null check (attempt_number >= 1),
  error_code text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index communication_events_idempotency_key_idx on communication_events (idempotency_key);
create trigger communication_events_set_updated_at before update on communication_events
  for each row execute function set_updated_at();

-- Atomic claim: single UPDATE ... WHERE ... RETURNING, so two concurrent
-- callers race at the database row-lock level and only one UPDATE affects
-- a row. Mirrors LocalAlertRepository.tryClaim's UNCLAIMABLE_STATUSES set.
create or replace function claim_alert(
  p_alert_id text,
  p_claimed_by text,
  p_claimed_at timestamptz,
  p_claim_expires_at timestamptz
) returns boolean
language plpgsql
security definer
as $$
declare
  v_updated_id text;
begin
  update alerts
  set status = 'claimed',
      claimed_by = p_claimed_by,
      claimed_at = p_claimed_at,
      claim_expires_at = p_claim_expires_at,
      updated_at = p_claimed_at
  where id = p_alert_id
    and status not in ('claimed', 'resolved', 'unresolved', 'cancelled')
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;
