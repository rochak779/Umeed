-- audit_events.actor_id is polymorphic by design: either a real profile id
-- (user-initiated action) or the literal sentinel "system" (scheduler-
-- initiated action — see raiseMissedRoutineAlert.ts, releaseExpiredClaim.ts).
-- The original FK to profiles(id) was a modeling mistake: it rejects every
-- system-actor audit event, since "system" is never a real profiles row.
-- actorType already distinguishes user vs system; no referential integrity
-- is needed here.
alter table audit_events drop constraint audit_events_actor_id_fkey;
