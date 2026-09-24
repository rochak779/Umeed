# Phase 0 — Repository audit and baseline

Date: 2026-08-27

## Stack

- **Framework:** TanStack Start (React 19) + TanStack Router, file-based routes in `src/routes/`.
- **Styling:** Tailwind CSS v4 + shadcn/ui primitives (`src/components/ui/*`), plus custom Umeed primitives (`src/components/umeed/*`).
- **State:** A single React context (`src/state/UmeedProvider.tsx`) holds all app data, persisted to `localStorage` under key `umeed.v2`. No server, no auth, no external services.
- **Data:** One static seed file (`src/data/seed.ts`, 484 lines) defines all types and mock records (people, vitals, reminders, alerts, timeline, documents).
- **Escalation logic:** `src/state/escalation.ts` builds alert objects inline (miss/SOS/helper-timeout); timing is driven by `setTimeout` inside the provider, gated by a `demoSpeed: "demo" | "real"` toggle.
- **Tooling:** ESLint (flat config) + Prettier + TypeScript strict mode. **No test runner is configured** (no Vitest/Jest, no `*.test.*` files anywhere).
- **External services:** None. `grep`-confirmed zero references to Supabase anywhere in `src/` or `package.json`. No `.env`/`.env.example` files exist.
- **Origin:** Repo is Lovable-generated (`AGENTS.md` carries the Lovable sync banner). `README.md` is literally the original Lovable build prompt: "Frontend only... Every piece of data is mock data... Build every screen... Do not leave any route as a placeholder."

## Baseline check results (before any change)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Pass**, no errors |
| `npx eslint .` | **86 pre-existing problems** (78 errors, 8 warnings). 78 are auto-fixable Prettier formatting diffs; the remaining 2 warnings are `react-refresh/only-export-components` in `UmeedProvider.tsx` (expected — it exports hooks alongside the provider component). No logic-level lint errors. |
| `npx vite build` | **Pass**, builds cleanly to `.output/` (SSR + client bundles) |
| Tests | **None exist to run.** |

These failures/warnings are pre-existing and were not introduced by this audit. No code was modified to produce these results (only `npm`/`vite`/`eslint`/`tsc` were invoked).

## Route inventory

| Route file | Persona | Purpose (current) |
|---|---|---|
| `index.tsx` | — | Persona chooser (child vs. parent) — a role switcher, not a real sign-in |
| `demo.tsx` | — | **Presenter/scenario-control panel**: miss-streak trigger, SOS trigger, fast-forward clock, reset-demo button — reachable from the live app |
| `parent.tsx`, `parent.index.tsx` | Older adult | Layout + redirect |
| `parent.welcome.tsx` | Older adult | Onboarding-ish welcome screen |
| `parent.login.tsx` | Older adult | Fake "login" (no real auth) |
| `parent.home.tsx` | Older adult | Home screen: reminders, done/help actions |
| `parent.help.tsx` | Older adult | SOS / help screen |
| `parent.photo.tsx` | Older adult | Mock photo-log flow (vitals via photo) |
| `parent.speak.tsx` | Older adult | Mock voice-log flow |
| `parent.profile.tsx` | Older adult | Profile view/edit |
| `child.tsx` | Family | Layout |
| `child.home.tsx` | Family | Dashboard |
| `child.onboarding.tsx` | Family | Onboarding (632 lines — largest route) |
| `child.alerts.tsx` | Family | Alerts list |
| `child.brief.tsx` | Family | Daily brief/summary |
| `child.documents.tsx` | Family | Document management |
| `child.family.tsx` | Family | Family/circle members list |
| `child.parent.$id.tsx` | Family | Per-parent detail view |
| `child.recommendation.$id.tsx` | Family | AI-style recommendation detail |
| `helper.tsx` | Nearby responder | Minimal helper (Sunita) response screen |
| `__root.tsx` | — | Root layout, push-notification host |

No route is a stub — the original Lovable prompt's "no placeholders" requirement was met. Every screen renders real (mock-backed) content.

## Mapping to Implementation.md's target structure

None of the target `domain/ application/ infrastructure/ features/ shared/ test/` structure exists yet. Concretely:

- **Domain layer, ports/interfaces, state machines, policies** (§8, §9, §11.1): **absent.** All logic lives inline in `UmeedProvider.tsx` and `escalation.ts` as plain functions coupled to React state and `setTimeout`.
- **Authentication** (§7.2, §11.3): **absent.** `parent.login.tsx` is a cosmetic form; there's no `AuthProvider`/`LocalAuthProvider`, no session, no sign-out, no password reset, no invitations.
- **Care circle, consent, permissions** (§7.8, §7.11, §13.3): **absent.** `child.family.tsx` lists family members from seed data with no permission model, consent record, or audit trail.
- **Routines & occurrences** (§7.7, §12): **partially analogous.** `Reminder` in `seed.ts` is a loose stand-in for `Routine`/`RoutineOccurrence` but has no timezone/DST handling, no occurrence generation, no state machine — just a 7-slot `days` array mutated directly.
- **Escalation engine & alert ownership** (§9, §10, §11): **partially analogous.** `missReminder`/`triggerSOS`/`helperRespond` produce an `Alert` with a `level`/`state`, resembling the spec's idea, but there's no configurable policy, no atomic claim, no claim expiry, and stage timing is faked via `demoSpeed` rather than a real clock abstraction.
- **Mock communications** (§11.6): **absent as a gateway.** `sendPush` in the provider is a single always-succeeds in-app toast; no SMS/voice/email simulation, no delivery states, no keypad simulation.
- **Direct help** (§10 "Direct help behaviour"): **partially analogous.** `parent.help.tsx` + `triggerSOS` roughly matches "I need help" bypassing stages, but doesn't yet show NHS 111/999 guidance or the required safety language.
- **Tests** (§17): **absent entirely.**
- **Demo/scenario machinery in product UI** (§1, §20 — explicitly forbidden): **present and must be removed.** `index.tsx` (persona chooser), `demo.tsx` (presenter controls), `resetDemo`/`advanceClock`/`demoSpeed` in `UmeedProvider.tsx` all violate this requirement directly.

## Reusable vs. obsolete

**Reusable as-is (visual layer only):**
- `src/components/ui/*` — shadcn primitives, framework-agnostic.
- `src/components/umeed/primitives.tsx`, `Wordmark.tsx`, `DeviceChrome.tsx`, `PushNotification.tsx` — generic UI scaffolding, no domain coupling.
- Tailwind design tokens in `src/styles.css` and `design.md`.
- Build/lint/format tooling as configured.

**Obsolete / to be replaced (not reused as domain logic):**
- `UmeedProvider.tsx` and `escalation.ts` — replaced by the domain/application/infrastructure layers in Phase 1 and consumed via ports, not a single monolithic context.
- `data/seed.ts` — replaced by domain entities/schemas; may inform fixture shape for tests only.
- All routes under `src/routes/` — restructured around the spec's roles (older adult / family coordinator / family member / nearby responder) and real auth-derived navigation; current `parent.*`/`child.*` naming and India-specific copy ("Namaste", "Mummy Ji") do not match the UK-focused product.
- `index.tsx` persona chooser and `demo.tsx` — deleted; replaced by a real landing page and authentication entry (§7.1, §7.2).
- `i18n/parent.ts` — India-specific copy; revisit once UK copy is defined.

## Pre-existing issues (not introduced by this audit)

- 78 Prettier formatting violations across ~10 files (auto-fixable).
- 2 `react-refresh/only-export-components` warnings in `UmeedProvider.tsx`.
- No test tooling configured — will need to be added in Phase 1 per Implementation.md §11 (repository contract tests, unit tests) before real domain code lands.
- `src/routeTree.gen.ts` has a small uncommitted diff (an auto-generated `Register` type block) produced by running `vite build`/`dev` locally — this is generated tooling output, not hand-authored change, and is safe to commit alongside this audit or regenerate later.

## Conclusion / acceptance criteria check

- Existing baseline behaviour is understood: **yes**, documented above.
- Existing build/test status is recorded: **yes** — build and typecheck pass, lint has pre-existing formatting debt, no tests exist yet.
- No feature behaviour has changed: **yes** — only read-only inspection commands were run; no application code was modified.

Phase 1 (domain foundations and local adapters) can begin next: define the domain entity types, ports, `Clock`/`IdGenerator`, local repositories, and `LocalAuthProvider` contract, all outside React, before any route is rebuilt.
