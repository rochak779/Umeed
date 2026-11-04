# Scheduled escalation job (go-live Session 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The every-minute `umeed-poll-due-work` job finishes in seconds, never floods a circle with alerts for long-past days, and is the only thing that raises missed-routine alerts in Supabase mode.

**Architecture:** Bound the job's work to a recent window (generate from yesterday; alert only on occurrences missed in the last 24 hours), read a routine's existing occurrences in one query, and isolate failures per routine/occurrence. A unique index makes a second alert for the same occurrence impossible. The in-app 15s poll is removed in Supabase mode; local mode keeps `LocalScheduler`.

**Tech Stack:** TypeScript use cases (shared by the app and the Deno edge function), Supabase Postgres + pg_cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-live-data-connection-design.md` (Session 4 was a non-goal there; scope agreed in chat on 2026-11-04).

## Findings that shaped this plan (live DB, 2026-11-04)

- The cron job exists but is inactive (`cron.job.active = false`).
- One manual invoke ran >120s: contract-test routine `r-1` (start 2026-01-01) was left enabled by a contract case, so the job backfilled ~300 days, one query per day, and raised 258 missed-routine alerts. Cleaned up by the contract suite's reset.
- The phone step (`voice`) in the default escalation policy never executes: `getEscalationStepForStage` skips older-adult steps and step timings are unused. No change.

## Global Constraints

- Files imported by `supabase/functions/umeed-poll-due-work/index.ts` keep explicit `.ts` import extensions (Deno).
- Migrations: `umeed` schema only, applied with `bun run db:migrate`; never `supabase db push`/`link`.
- Function deploy: `supabase functions deploy umeed-poll-due-work --project-ref aqvpdfdfsterpdumjglx` (no link).

## Tasks

### Task 1: Bounded, single-query occurrence generation
- `generateOccurrences(deps, { routineId, upToLocalDate, fromLocalDate? })`: candidates start at the later of `routine.startDate` and `fromLocalDate`; existing occurrences read once with `findByRoutine`.
- Tests (`generateOccurrences.test.ts`): `fromLocalDate` skips earlier days; `findByRoutineAndScheduledForUtc` is never called (one read per routine).

### Task 2: Recent-window, failure-tolerant poll
- `OccurrenceRepository.findDue(nowUtc, notBeforeUtc)` — local, Supabase, contract case for the lower bound.
- `pollDueWork`: generate from yesterday (UTC date − 1); `findDue(now, now − 24h)`; a throw in one routine or occurrence is counted in `errors` and the run continues. Result gains `errors: number`.
- Tests: window values passed through; one failing occurrence doesn't stop the next; result counts errors.
- Edge function logs `errors` and still returns 200 with the result.

### Task 3: One alert per occurrence (migration)
- `supabase/migrations/20261104100000_umeed_alerts_one_per_occurrence.sql`: `create unique index if not exists alerts_occurrence_id_unique_idx on umeed.alerts (occurrence_id) where occurrence_id is not null;`

### Task 4: Job is the only scheduler in Supabase mode
- Remove `runDueWorkFor`/`runDueWorkFn`/`alertApi.runDueWork` and its test; `app.tsx` only mounts `LocalScheduler` in local mode.

### Task 5: Contract tests stop leaving work for the job
- `supabaseRepositories.contract.test.ts` `afterAll`: `disableFixtureRoutines(client)` sets `enabled = false` on the fixture routines.

### Task 6: Deploy and switch on
- Deploy the function; invoke once: expect 200 in a few seconds, no new alerts for fixture circles.
- Migration `20261104100100_umeed_enable_poll_due_work.sql`: `cron.alter_job(..., active := true)` for `umeed-poll-due-work`.
- Watch two scheduled runs succeed in `net._http_response`.

## Review Focus

- Job down for days, then back: no alert storm for old days (24h window).
- Two overlapping runs: at most one alert per occurrence (unique index + per-occurrence isolation).
- Routine created today with a time already passed: no immediate alert (existing `createdAt` rule kept).
