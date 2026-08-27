# Umeed — Design System & Consistency Audit

This documents the design patterns actually implemented in the codebase, benchmarked against the
build spec in `README.md`, and flags every place the two disagree or the app is internally
inconsistent with itself.

**TL;DR — 3 real bugs, 1 major spec deviation, several DRY gaps.** See §7 for the "if you fix
nothing else" list.

---

## 1. Design tokens

Tokens live in `src/styles.css` as CSS custom properties (`:root`), mapped into Tailwind v4's
`@theme inline` block. No `tailwind.config.ts` exists — Tailwind v4's CSS-first config replaces it,
which is a reasonable adaptation of the spec's letter ("map them in tailwind.config.ts").

**The shipped palette is the canonical brand — the README's hex values are stale, not the source
of truth.** The app has moved on from the README's original warm sage/marigold proposal to a
greener, more saturated Material Design 3–style palette, and that's the intended direction. The
README's numbers below should be treated as historical/superseded; `design.md` (this file) is now
the reference for actual token values:

| Token | Actual (canonical) | README (superseded) |
|---|---|---|
| `--sage` | `#296745` | ~~`#5E9C76`~~ |
| `--sage-tint` | `#b0f1c6` | ~~`#EAF2ED`~~ |
| `--trust` | `#2f6099` | ~~`#3F6EA8`~~ |
| `--marigold` | `#7a5500` | ~~`#D9A441`~~ |
| `--critical` | `#ba1a1a` | ~~`#C95A5A`~~ |
| `--bg` | `#f6fafe` (cool blue-white) | ~~`#F8F7F4`~~ |
| `--text` | `#171c1f` | ~~`#2F3437`~~ |
| `--border` | `#c0c9c0` | ~~`#E5E7EB`~~ |

This is applied consistently everywhere, which is why it reads as a deliberate, cohesive re-theme
rather than drift. **Action item: update the README's §3 hex table to match** so the two documents
stop disagreeing — right now README.md is the one that's wrong, not the code.

Additional tokens beyond the README (used consistently, keep these): `--trust-tint`,
`--marigold-tint`, `--critical-tint`, `--container`, `--container-low`, `--container-high`,
`--frame`, `--device`.

**Radii also deviate**: spec wants button radius 14px. Actual `--radius-btn: 9999px` — every
button in the app is a full pill, not a rounded rectangle. Consistent app-wide, but a clear,
systemic spec deviation, not an accident.

**Raw hex outside the token file**: none in `src/routes` or `src/components/umeed` — clean.
Two minor exceptions: `src/lib/error-page.ts` (a dev error-boundary HTML string, infrastructure
not a designed screen) and a `theme-color` meta tag in `__root.tsx` (unavoidable, matches `--bg`).

**shadcn slate/zinc/neutral/gray**: none used anywhere in app code. Note `components.json` still
sets `"baseColor": "slate"`, so any *newly scaffolded* shadcn component would default there — a
latent trap for future contributors, not a current violation. Also worth knowing: of the 46 files
in `src/components/ui`, only `sonner` (Toaster) is actually imported anywhere — the rest is unused
shadcn boilerplate sitting in the repo.

---

## 2. Persona typography system

Real, working two-scale system — not hardcoded per component. `data-persona` is set on the phone
frame in `__root.tsx`; `styles.css` defines `[data-persona="child"]` / `[data-persona="parent"]`
blocks overriding `--fs-*` variables, consumed by seven `t-*` utility classes (`t-display`,
`t-title`, `t-section`, `t-card-title`, `t-body`, `t-caption`, `t-button`). Every value matches the
spec's child and parent scales exactly (only the "heading" var is internally named `--fs-section`
instead — naming-only, harmless).

**🐛 Bug — `t-hero` is used but never defined.** It appears at 8 call sites across 5 files:
`parent.login.tsx`, `parent.welcome.tsx`, `parent.speak.tsx`, `parent.help.tsx`, `parent.photo.tsx`.
`t-hero` doesn't exist in `styles.css`, so it's a no-op class — meaning the single biggest, most
important text on each of these screens (the login greeting, welcome card titles, the spoken
reading confirmation, the SOS countdown number) renders with **no explicit size at all**, falling
back to Tailwind/browser defaults. This directly undercuts the parent persona's core "huge type"
requirement at exactly the moments it matters most (login, SOS). This looks unintentional, not a
style choice — likely a rename that didn't get finished.

---

## 3. Component primitives (`src/components/umeed/primitives.tsx`)

Implements `UButton`, `UCard`, `StatusPill`, `SectionHeader`, `EmptyState`, `TopBar`, `Avatar`,
`BottomNav`, `Sparkline`, `DotStrip`, `WhyPanel`, and `Screen` (a page-wrapper not named in spec,
but a reasonable addition).

- **UButton**: variants and sizes (md/lg/xl = 48/56/64px) match spec exactly, press-scale 0.98
  implemented. **Deviation**: spec's `secondary` variant is "white fill, sage border, sage text" —
  the actual implementation is blue (`trust`-colored border/text), so *every* secondary button in
  the app (e.g. "Remind me tonight," "Message on WhatsApp") is blue where the spec calls for sage.
- **UCard**: matches spec's white/border/shadow recipe, but its radius (1.25rem via the
  `card-calm` utility) doesn't match the `--radius-card` token defined a few lines above it in the
  same file (1rem) — two different "card radius" values coexist, an internal inconsistency
  independent of the palette question.
- **StatusPill, SectionHeader, EmptyState, TopBar, BottomNav, Sparkline, DotStrip, WhyPanel**: all
  present and faithful to spec (icon+word on every status, dash icon on missed DotStrip days, etc).

**Inconsistent use across routes — this is the app's biggest "doesn't look consistent" issue:**
`TopBar` exists and is used correctly in several routes, but **six other routes hand-roll the
identical header markup instead of using it** (`child.home.tsx`, `child.parent.$id.tsx`,
`child.brief.tsx`, `child.recommendation.$id.tsx`, `child.alerts.tsx`, `parent.help.tsx`) —
the same sticky-header JSX duplicated near-verbatim six times, when `TopBar`'s `right` prop already
supports what they need. Similarly, several screens hand-roll `card-calm` divs instead of `UCard`
(persona chooser, "What changed" rows on child home, event/reminder rows on the parent profile
screen) — so the app has two parallel ways of making a card, used unevenly.

---

## 4. Recurring patterns

- **"Why we are saying this"** — the spec calls it mandatory on every AI insight. It's correctly a
  shared `WhyPanel` component in two places (child home, Care Brief), but `child.recommendation.$id.tsx`
  re-implements the same content and closing disclaimer by hand instead of reusing `WhyPanel` — so
  the "mandatory" panel has two different implementations and the disclaimer text is duplicated
  verbatim in three files rather than living in one place.
- **Empty states**: consistently implemented via the shared `EmptyState` primitive, copy matches
  spec's required strings exactly. Clean pattern, no notes.
- **Toasts**: single mechanism app-wide (sonner), styled once globally. Clean.
- **Bottom sheets**: never extracted into a shared primitive — at least four screens (onboarding
  verify, add-reminder, documents detail/add, family edit-member) each hand-roll their own overlay,
  close button, and animation wrapper independently, and inconsistently: some animate in/out with
  framer-motion, one (`child.family.tsx`) has no entry/exit animation at all. This is the clearest
  candidate for a shared `BottomSheet` primitive that doesn't exist yet.
- **Form fields**: three near-duplicate label+input wrapper components exist (`Field` in
  onboarding, `EditField` in family, another `Field` in the parent profile screen), plus a literal
  character-for-character duplicated `inputCx` Tailwind string constant across two files.
- **Motion**: consistent use of the shared `Screen` fade+rise entrance and button tap-scale;
  `prefers-reduced-motion` respected globally. Clean.
- **Loading skeletons**: spec requires sage-tint-at-40%-opacity skeletons everywhere something
  loads. **None exist anywhere in the codebase** — the simulated-latency flows (speak, photo) use
  text + a progress bar instead. This reads as an unimplemented piece of spec, not a redesign.

---

## 5. Parent-experience rule compliance

Bottom nav correctly absent on all `/parent/*` routes, present on all `/child/*` routes (except
during onboarding) — matches spec.

Spot-checked the parent screens against the spec's non-negotiable rules (body ≥20px, buttons
≥64px, ≤3 primary controls, no charts/medical words/percentages/red-except-emergency):

- Mostly compliant, **except** the `t-hero` bug above means the largest text on login/welcome/
  speak/photo/help renders unsized, undermining the "huge type" rule at its most important moments.
- **🐛 Bug — the one screen that's *supposed* to use red doesn't.** `parent.help.tsx`'s big
  press-for-help button and its SOS countdown number use `bg-alert` / `text-alert` / `shadow-lift`
  — none of these classes are defined anywhere (only `--critical` exists, not `--alert`). The single
  sanctioned use of red in the entire app currently renders with no color or shadow at all. This is
  the most consequential bug found — it inverts the spec's intent on the one screen where visual
  urgency actually matters.
- **Parent login doesn't match the spec's described flow.** Spec: OTP should fill itself in a 3-second
  animation — "never make her type a code." Actual: a manual 6-digit text input she has to type into
  herself, gated behind a disabled button until 6 digits are entered — the opposite of what's
  specified. There's also a stray code comment confirming a spec-required "Ask [child] to call me"
  button was deliberately removed, leaving its i18n strings orphaned in both language dictionaries.
- **`parent.help.tsx` deviates from its own spec's interaction shape.** No yes/no confirmation
  step before sending help (spec requires one); countdown is 10 seconds, spec says 5; the "who's
  been notified" list is static rather than progressing through Notified → Seen → On the way per
  person as described.
- **`/parent/profile` exists but isn't in the spec** — and the spec explicitly lists "no settings
  page beyond what is described" under "DO NOT BUILD." This is a small out-of-spec addition (an
  edit-my-details screen reachable from parent home).
- **Language toggle is missing.** Spec requires an English/हिन्दी toggle in the parent home top bar.
  The i18n data supports both languages fully, but no on-screen control lets the user switch — the
  language is only ever derived from seed data. Looks unfinished rather than intentional.

---

## 6. Forbidden vocabulary & accessibility

**Forbidden words** (patient, monitor, tracking, compliance, anomaly, "invalid input", "processing",
"no data", etc.): clean pass, no genuine hits anywhere in routes/components/copy.

**Accessibility**: generally careful and systematic — `aria-label` on icon-only buttons throughout,
`aria-live="polite"` on toasts/status text, `aria-live="assertive"` correctly used specifically on
the SOS countdown, global 2px sage `:focus-visible` ring, 48px touch targets used as a pervasive
floor, chart `<ResponsiveContainer>` correctly marked `aria-hidden` with a text summary doing the
real communication. No systemic gaps found — this is one of the stronger-executed parts of the spec.

---

## 7. Fix-priority punch list

If picking a small number of things to fix first:

1. **`bg-alert` / `text-alert` / `shadow-lift` undefined** — restyle `parent.help.tsx`'s emergency
   button/countdown with real tokens (presumably `--critical`). The one screen meant to use red
   currently doesn't.
2. **`t-hero` undefined** — either define it in `styles.css` or replace the 8 call sites with an
   existing scale class. Currently silently breaking "huge type" on 5 parent screens.
3. **Update README.md's §3 token table** to match the actual shipped values (§1 above) — the
   palette itself is settled (keep the greenish Material-style tokens), the README is just out of
   date and should stop contradicting the code.
4. **`TopBar`/`UCard` bypassed in ~6+ places** — worth a pass to route those screens through the
   shared primitives so header/card treatment is actually uniform, not "usually."
5. **No `BottomSheet` primitive** — four independently-built sheets with inconsistent animation;
   worth consolidating given how much markup is duplicated.
6. Lower priority: parent login's typed-OTP flow vs. spec's self-filling animation, missing
   language toggle, `/parent/profile` being out-of-spec, missing loading skeletons, minor timing
   drifts (2.2s vs 2.5s, 1.8s vs 2s), `localStorage` key `umeed.v2` vs spec's `v1`, two stray empty
   `{"\n"}` text nodes, and demo panel missing several spec'd controls (acknowledge-as-Sunita,
   jump-one-week, set-Manoj-to-Watch, the three scripted push notifications) and its "tool, not a
   feature" grey/monospace visual treatment.
