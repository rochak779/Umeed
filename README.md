# Umeed

Build a complete mobile-app prototype called Umeed. Frontend only. No backend, no auth

provider, no Supabase, no database, no API calls. Every piece of data is mock data held in

React context, seeded from one file, persisted to localStorage. Build every screen listed

here as a real working screen. Do not leave any route as a placeholder, a stub, or a

"coming soon" page.

=== 1. WHAT UMEED IS ===

Umeed is a family care app for elder care in India. Tagline: "Someone is always close by."

One adult child pays for the family. The plan covers both parents, siblings, and one trusted

neighbour who acts as the local safety net.

The core idea: the parent does almost nothing. One or two taps, a photo, or a spoken reading.

Silence itself becomes the signal. If a parent misses a reminder three times in a row, the

neighbour nearby is asked to look in, automatically, before it becomes an emergency.

One brand, two experiences in one codebase:

- Adult child: information rich, helps her decide what to do today.

- Elderly parent: huge type, three buttons, voice first, nothing to learn.

=== 2. STACK AND SHELL ===

React + TypeScript + Vite + Tailwind + shadcn/ui + react-router-dom + lucide-react +

framer-motion + recharts. Nothing else.

The whole app renders inside a centred phone frame: max-width 430px, min-height 100dvh, page

background outside the frame is #EDEBE6. Under 480px viewport the frame goes full bleed.

Design everything for a 390px wide phone. No desktop layout. No marketing landing page. The

app opens straight into the persona chooser.

=== 3. DESIGN TOKENS ===

Define these as CSS variables in index.css and map them in tailwind.config.ts. Never write a

raw hex anywhere else in the app. Never use shadcn default slate, zinc, or neutral classes.

--sage: #5E9C76 primary brand, safety and wellbeing

--sage-dark: #4A7D5E pressed state

--sage-tint: #EAF2ED soft fills, selected chips, skeletons

--trust: #3F6EA8 secondary actions, links

--marigold: #D9A441 accent, "needs attention" without panic

--success: #3BAA5C

--warning: #E7B93C

--critical: #C95A5A emergencies only, used sparingly

--bg: #F8F7F4 warm off-white app background

--surface: #FFFFFF cards

--text: #2F3437 charcoal

--text-soft: #6B7280

--border: #E5E7EB

Typography: Inter from Google Fonts, weights 400 500 600 700, set as the Tailwind sans family.

Two type scales driven by a data-persona attribute on the shell root. Implement by scaling the

font-size CSS variables under each persona selector so the same components grow automatically.

data-persona="child": display 32/700, title 28/600, section 22/600, cardTitle 18/500,

                         body 16/400, caption 14/400, button 16/500

data-persona="parent": display 36/700, title 32/600, heading 24/600,

                         body 20/400, button 20/500, caption 18/400

Line height 1.5 for body, 1.25 for headings. Use rem everywhere.

Spacing: 8px grid. Only these values: 4 8 12 16 24 32 48 64.

Radii: card 16, button 14, input 12, avatar full.

Elevation: very light. Cards get a 1px --border hairline plus

box-shadow 0 1px 2px rgba(47,52,55,0.04), 0 8px 24px rgba(47,52,55,0.04). No heavy shadows.

Look and feel: calm, warm, roomy. Generous whitespace, hairline dividers, flat surfaces. No

gradients, no glassmorphism, no purple, no neon, no dark mode, no stock illustrations, no

decorative blobs. The one memorable element in the whole app is the escalation ladder in

section 9. Keep everything around it quiet.

=== 4. COMPONENT PRIMITIVES (build these first, in /src/components/umeed) ===

UButton: variants primary (sage fill, white text), secondary (white fill, sage border, sage

text), ghost, danger (muted critical). Sizes md 48px tall, lg 56px, xl 64px. Press state

scales to 0.98. Minimum touch target 48x48 everywhere, no exceptions.

UCard: white surface, 16 radius, 16 padding, hairline border.

StatusPill: three states, Steady (sage), Watch (marigold), Needs attention (critical). Every

pill shows an icon AND a word. Colour is never the only cue, anywhere in this app.

SectionHeader, EmptyState, BottomNav, TopBar (title, optional back, optional avatar),

Sparkline, DotStrip (7-day done / missed / upcoming, missed dots carry a dash icon inside).

Icons: lucide-react only.

=== 5. SEED DATA (/src/data/seed.ts) ===

Adult child, the logged-in user: Aditi Rao, 41, Bengaluru, runs her own business.

Mother: Anuradha Rao, 68, Kota Rajasthan, homemaker, hypertension.

Medicines: Telmisartan 40mg at 8:00 am, Calcium + D3 at 9:00 pm.

Father: Manoj Rao, 72, Kota Rajasthan, retired bank officer, type 2 diabetes and high

cholesterol. Medicines: Metformin 500mg after dinner, Atorvastatin at 10:00 pm.

Sibling: Rohan Rao, 37, Pune, read only.

Neighbour nearby: Sunita Sharma, 54, 200 metres away, Kota.

14 days of vitals per parent (BP, pulse, sugar, weight) in realistic Indian ranges, with a few

gaps. Anuradha's BP climbs over the last 5 days from 128/82 to 146/92, and she has missed her

8:00 am reminder twice in a row. Manoj is steady.

5 documents: 2 prescriptions, 1 lipid profile, 1 HbA1c report, 1 pharmacy bill. Each has

parent, date, type, source (WhatsApp / Camera / Gmail), and 3 to 5 extracted key-value fields.

A timeline of about 10 events across both parents.

=== 6. STATE (/src/state/UmeedProvider.tsx) ===

persona ('child' | 'parent'), activeParentId, family, vitals, documents, reminders, timeline,

alerts, sosActive, demoSpeed.

Actions: logVital, addDocument, completeReminder, missReminder, triggerSOS, acknowledgeAlert,

helperRespond, advanceClock, resetDemo.

Persist under localStorage key "umeed.v1". resetDemo restores the seed. Setting persona also

sets the data-persona attribute on the shell root.

=== 7. ROUTES. Build all of them. ===

/ persona chooser

/child/onboarding 6 step flow

/child/home daily answer

/child/parent/:id full profile, 4 tabs

/child/brief weekly Care Brief

/child/recommendation/:id what to do and why

/child/documents shared vault

/child/family who sees what

/child/alerts alert inbox

/parent/login

/parent/welcome

/parent/home

/parent/speak

/parent/photo

/parent/help

/helper the neighbour's view, no login

/demo presenter control panel

Child screens get a bottom nav: Home, Parents, Documents, Family. Parent screens get no bottom

nav at all.

=== 8. SCREENS ===

PERSONA CHOOSER (/)

Umeed wordmark, tagline, two large cards: "I am the family member" (Aditi) and "I am the

parent" (Anuradha). Small text link "Reset demo data". This is the first thing a reviewer

sees, so make it beautiful.

CHILD ONBOARDING (/child/onboarding). Six steps, one question per screen, slim progress bar,

back arrow on every step except the first.

1. Welcome. Wordmark, tagline, one line: "Know how your parents really are, without asking

   them to prove it." Button "Get started".

2. Your number. Country code defaulting to +91, also +1 +44 +971 +65. Then a 6 box OTP screen,

   any 6 digits work, auto advance between boxes, caption hint "Use 123456 for the demo".

3. Add your parents. Up to two. Name, relationship, age, WhatsApp number, email optional,

   language (English, हिन्दी, मराठी, தமிழ், తెలుగు, ಕನ್ನಡ, বাংলা). Each parent has a Verify

   action that opens an OTP sheet reading "Ask Mummy to read out the code she just got. This

   makes sure alerts reach the right phone." Verified parents get a sage check chip. Pre-fill

   Anuradha and Manoj, keep fields editable.

4. Add family. Optional. Siblings by name and number. Note: "They see everything you see."

   Pre-filled with Rohan.

5. Add someone nearby. This is the emotional centre, give it room. Lead with one short

   paragraph: "If your parents ever miss something important, we reach someone close by

   first. Not a call centre, and not you from three hours away." Fields: name, relationship

   (Neighbour / Relative / Family friend), number, distance from their home. Pre-filled with

   Sunita.

6. You are set. Checklist: SOS works from today (done), Reminders start tomorrow morning

   (done), Your first Care Brief builds over the next few days (pending). Button "Go to home".

Inputs are 48px minimum, 12 radius, clear focus rings. Errors are specific and kind: "That

number needs 10 digits", never "Invalid input".

CHILD HOME (/child/home). Answers exactly one question: do I need to do anything today?

Top to bottom:

1. TopBar: "Good morning, Aditi", date, avatar.

2. Parent switcher: two avatar chips side by side with a StatusPill under each. Anuradha is

   Watch, Manoj is Steady. Tapping switches the whole screen.

3. Today card, the hero. For Anuradha: "Mummy's blood pressure has been climbing this week."

   Sub line: "Logged 5 of 7 days. Last reading 146/92 this morning."

4. One recommended action. A single card, never a list. "Call Mummy today and ask if she has

   been taking her 8 am tablet." Buttons "Call now" and "Remind me tonight".

5. "Why we are saying this", an expandable panel on that card. Opens to three plain lines:

   average BP up from 129/83 to 141/89 over 5 days; the 8 am reminder was missed twice this

   week; no prescription change since 14 March. Closes with "Umeed does not diagnose. It

   notices patterns and tells you why." This panel is mandatory on every AI-generated insight

   in the app.

6. What changed. Three rows with small sparklines or delta chips.

7. Quiet day state. When the active parent is Steady, replace items 3 to 6 with a leaf icon,

   "Everything looks normal today", and "We will let you know if anything needs you."

CHILD PARENT PROFILE (/child/parent/:id). Four tabs.

Overview: age, city, conditions, current medicines, nearby contact card with a call button,

last 5 activity rows.

Vitals: BP, sugar, pulse, weight cards. Each has a 14 day recharts line chart with a normal

range band, the last reading, the time, and how it was logged (voice or photo). Every chart

carries a one line text summary above it.

Reminders: medicines, vitals and appointments with time, frequency, and a 7 day DotStrip.

"Add reminder" opens a sheet with type, label, time, days, and which parent.

Timeline: reverse chronological, grouped by date, icon per event type.

CHILD DOCUMENTS (/child/documents). Filter chips All / Mummy / Papa plus a type filter. Cards

show a thumbnail placeholder, title, date, source badge, and an "Auto filed by Umeed" chip.

Tapping opens a sheet with extracted fields as a clean key and value list plus a "Something

wrong here?" link. Floating button offers Take a photo, Upload from device, and Forward on

WhatsApp, which shows a bot number +91 98765 43210 with a copy button.

CHILD FAMILY (/child/family). Sections You, Parents (with verified chips), Siblings, Someone

nearby. Each person shows what they can see, in plain words:

Rohan: "Sees everything you see. Gets alerts only after 30 minutes."

Sunita: "Gets the first alert. Does not see medical records."

Plus an Invite row and a "How we reach people" link that opens the ladder from section 9.

CARE BRIEF (/child/brief). Answers: what changed?

Header "Mummy's week", date range, one line verdict: "A steadier week than last, with one

thing worth a call." Three groups: Improved, Steady, Worth watching. Each item is one plain

sentence with the number in it: "Took her evening calcium 6 of 7 nights, up from 3."

Footer "How we know": 12 readings logged, 2 documents added, 14 reminders sent, 2 missed.

Buttons "Share with Rohan" and "Save as PDF", both fire a toast. Week arrows, with an empty

state for weeks before signup: "Umeed joined the family on 12 March. Nothing before that."

RECOMMENDATION (/child/recommendation/:id). Answers: what should I do?

The recommendation in one large sentence. Confidence in words not percentages: "We are fairly

confident about this." Full reasoning: what was seen, over what period, and what would change

the advice. "What to say": three warm conversation openers, for example "Mummy, how has the

new tablet been sitting with you in the mornings?" Actions: Call now, Message on WhatsApp,

Mark as done, Not relevant. "Not relevant" opens a one tap reason chooser that visibly thanks

her for the correction.

PARENT EXPERIENCE. This is the design centrepiece. Set data-persona="parent" for the whole

/parent route. Non-negotiable rules for every parent screen:

- One question or one action per screen. Never two.

- Body text never under 20px. Buttons never under 64px tall.

- Maximum three primary controls on screen at once.

- No charts, no dashboards, no medical words, no numbers she did not say herself.

- Nothing that implies watching, scoring or judging. No streaks, no percentages.

- No red anywhere except a real emergency.

/parent/login: big wordmark, "Enter your phone number", one large input, one large button.

Then "We have sent a code. We will read it for you", and a 3 second animation that fills the

OTP itself and moves on. Never make her type a code.

/parent/welcome: three swipeable cards, a large illustration area, one sentence each, and a

Play speaker button on each. "Tap the green button to say how you are feeling." "Tap the

camera to send a prescription. No typing." "Tap the red button if you need help right now."

Then a button "I am ready".

/parent/home: the entire app for her, on one screen.

"नमस्ते, Anuradha ji" and today's date in large type.

One card at a time. If a reminder is due it is the only thing in focus: "Time for your

morning tablet, Telmisartan 40 mg", with two very large buttons, "Taken" (sage, check icon)

and "Not yet" (white, sage border).

Below it three permanent tiles, 96px tall, icon and word: Speak, Photo, Help.

If nothing is due: "Nothing to do right now. Aditi says hello."

No bottom nav. One small Family icon top right opens a screen with photos of Aditi, Rohan

and Sunita and big call buttons. That is all it does.

A language toggle sits in the top bar (English / हिन्दी). Translate the home screen, the

reminder card and the SOS screen into Hindi so the claim is real.

/parent/speak: full screen, one purpose. Large pulsing sage microphone. Above it "Tell me your

reading." Caption below: "For example, blood pressure 130 over 85." Simulate 2.5 seconds of

listening with a live waveform, show the transcript in large text, then a confirmation card

"Blood pressure, 130 over 85. Is that right?" with "Yes, save" and "Say it again". On save,

a tick that draws itself, then "Saved. Aditi can see this now", then return home after 2

seconds. The reading must actually appear in the child's vitals.

/parent/photo: viewfinder frame, one giant shutter. After capture, 2 seconds of "Reading

this..." with a calm sage progress bar, then "Prescription from Dr Mehta, 28 July. 3

medicines found", with "Yes, that is right" and "Something is wrong". On confirm: "Filed

under your prescriptions. Aditi can see it too." It must appear in the child's documents.

/parent/help: always asks once, with a 5 second cancel countdown, so a stray tap is never an

emergency. "Do you need help right now?" with "Yes, send help" and "No, go back". After

sending, the screen becomes calm status, not a red alarm: "Help is on the way." "Sunita has

been told. She is 200 metres away." "Aditi has been told too." A live list showing each

person as Notified, then Seen, then On the way. One button: "I am okay now", which cancels

and tells everyone.

=== 9. THE ESCALATION ENGINE. This is what makes Umeed an early warning system. ===

Implement in /src/state/escalation.ts.

Miss 1: gentle second reminder to the parent after 30 minutes.

Miss 2: another reminder, and a quiet note appears in the child's "What changed".

Miss 3: Sunita is asked automatically. The child is told in parallel that Sunita has been

    asked to look in.

If Sunita has not responded within 30 minutes, the child gets a direct escalated alert.

SOS is separate and instant. It reaches Sunita and Aditi at the same moment.

Expose demoSpeed so 30 minutes becomes 5 seconds during a walkthrough.

/child/alerts: rows show parent, what happened, when, who has been told, and state (Sent,

Seen, On the way, Resolved). Each row has an acknowledge action. Alert copy pushes action

without causing panic:

Good: "We have noticed a few changes this week. It may be a good time to check in with

Mummy." Good: "Mummy has not confirmed her morning tablet three days running. We have asked

Sunita to look in." Never: "Your mother may have a problem."

/helper: the neighbour's view. No login. Make the ask specific, not generic:

"Anuradha Rao has not confirmed her 8 am blood pressure tablet for three days. Could you

look in on her today? She is at B-14, Vigyan Nagar."

One large button "I am going", secondary "I cannot right now". Either choice updates state

everywhere else in the app immediately. Show what Sunita can and cannot see. Close with

"Umeed shares only what Sunita needs to help."

ESCALATION LADDER: a reusable animated component used in onboarding and from /child/family.

Four steps with icons: Parent reminded, Reminded again, Neighbour asked, Family alerted. SOS

is drawn as a parallel line that jumps straight to the last two. The active step animates.

This is the signature visual of the product. Spend your design effort here.

/demo: presenter panel, also reachable by tapping the wordmark five times. Grey surface,

monospace labels, styled as a tool and not a feature. Controls: simulate a missed reminder,

fire the 3 miss escalation now, trigger SOS as Anuradha, acknowledge as Sunita, jump the clock

one day, jump one week, set Manoj to Watch, reset demo data. Plus three scripted push

notifications: "Mummy just sent a prescription. Filed under her reports." / "We have noticed a

few changes this week. It may be a good time to check in with Mummy." / "Sunita is on her way

to Mummy's. She will update in a few minutes."

=== 10. CONNECTIVE TISSUE ===

Toasts appear at the top, 16 inset, 14 radius, auto dismiss after 4 seconds, icon plus word.

A simulated push notification component that slides in over the app.

Motion with framer-motion, all subtle, all respecting prefers-reduced-motion: insight cards

fade and rise 8px when analysis completes; a tick that draws itself over 400ms; a calm

indeterminate sage bar labelled "Reading this..." not "Processing"; buttons scale to 0.98 on

press; status pill colour changes ease over 300ms. Nothing flashes, bounces, or pulses in red.

Loading uses skeletons in sage tint at 40% opacity, never grey spinners.

Empty states, one for every list, each with an icon, a reassuring line, and a next action:

Documents: "Nothing here yet. Forward a prescription on WhatsApp and it files itself."

Timeline: "Umeed is still getting to know their week."

Alerts: "No alerts. That is exactly what we want."

Vitals: "No readings yet. Ask Mummy to tap the green button and say one out loud."

The string "No data" must never appear anywhere in this app.

=== 11. VOICE ===

Calm not clinical. Warm not robotic. Plain words, sentence case, active voice, short lines.

Say "Check in with Mummy today", never "Anomaly detected in vitals".

These words must not appear anywhere a user can read them: patient, subject, monitor,

monitoring, tracking, compliance, score, anomaly, non-compliance, invalid input, processing,

no data. Use instead: Mummy or Papa or their name, noticing, keeping up with, kept up,

something worth a call, "that number needs 10 digits", "Reading this...", "Everything looks

normal today".

=== 12. QUALITY FLOOR. Hold to this while building, not as a later pass. ===

Every interactive element is at least 48x48 CSS px with 8px between neighbours.

Every text and background pair meets 4.5:1, and 3:1 for large text and controls.

Every icon-only control has an aria-label. Every status uses icon plus text.

Every chart has a text summary beside it.

One h1 per screen. Semantic landmarks. aria-live polite on toasts and saved readings,

assertive on SOS status changes.

Visible 2px sage focus ring at 2px offset, logical tab order, full keyboard operability.

Nothing clips or truncates at 200% browser text size. Cards grow, text does not ellipsis.

=== 13. BUILD ORDER. Follow it exactly. ===

1. Tokens, Tailwind config, shell, primitives, seed data, context, routing.

2. Persona chooser.

3. Child onboarding.

4. Child home, parent profile, documents, family.

5. Care Brief and recommendation detail.

6. The whole parent experience.

7. Escalation engine, alerts, helper view, ladder component, demo panel.

8. Toasts, push simulation, motion, empty states.

Do not stop until this exact path works end to end:

persona chooser, child onboarding all six steps, child home with Anuradha on Watch, open "Why

we are saying this", Care Brief, switch to parent, parent home, speak a reading, see that

reading appear in the child's vitals, /demo, fire the 3 miss escalation, /helper, tap "I am

going", child alerts flips to On the way, parent SOS with the 5 second cancel, "I am okay

now".

=== 14. DO NOT BUILD ===

No wearables, no automatic vitals capture, no companionship chat, no video calling, no

transcript history, no share-to-doctor digest, no payments or checkout, no settings page

beyond what is described, no dark mode, no desktop view. If you are running long, build every

screen at lower visual polish rather than skipping any screen.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://umeed-always-near.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b74a6ed2-3f31-4324-84c1-4d8e6623e318).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

This repository has grown beyond the original Lovable prototype into a locally-architected
app following `Implementation.md`'s ports-and-adapters design: every entity is served by a
local, interface-bound adapter (`LocalAuthProvider`, `LocalCollection`-backed repositories, a
mock notification gateway) that a real backend can replace later without touching product
code. It uses **bun**, not npm, as its package manager and script runner — confirm this
against `package.json`'s `scripts` block if in doubt.

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

The app opens in the browser with a persona chooser. All state lives in `localStorage`; there
is no server-side database to seed or migrate.

### Fixture accounts

There are no hardcoded fixture credentials. `LocalAuthProvider` (see
`src/infrastructure/local/auth/LocalAuthProvider.ts`) stores accounts created through the
app's real registration and sign-in flow — start at `/sign-up` (or `/onboarding`) and create
an account the normal way; it persists to `localStorage` under `umeed.auth_accounts` and
survives a page reload. To start over, clear site data or use the reset path exposed in the
product's own demo/reset affordance.

### Test commands

```sh
bun run test          # run the full unit/integration suite once (vitest run)
bun run test:watch    # the same, in watch mode
bun run lint          # eslint over the whole repo
bun run format        # prettier --write, formats the repo in place
bunx tsc --noEmit     # type-check without emitting output
bun run build         # production build (vite build)
```

To run only the repository contract suite (the tests that check every local repository
implementation honours the same port contract):

```sh
bun run test test/contracts
```

### Supabase adapters

Phase 9 added a Supabase-backed implementation of every repository port alongside the
existing Local* adapters, without changing any product code path. Which set is used is
controlled by the `DATA_ADAPTER` environment variable, read once at module load in
`src/features/authentication/container.ts`:

- `DATA_ADAPTER` unset or `local` (the default): local, `localStorage`-backed adapters, same
  as before this phase — no behavior change.
- `DATA_ADAPTER=supabase`: every repository (`profileRepository`, `careCircleRepository`,
  `invitationRepository`, `consentRepository`, `auditRepository`, `routineRepository`,
  `occurrenceRepository`, `alertRepository`, `communicationRepository`) is backed by its
  `Supabase*Repository` implementation instead. `authProvider` is unaffected — it stays on
  `LocalAuthProvider` in both modes; wiring real Supabase Auth is Phase 10 scope.

`supabase` mode requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` set in `.env.local` (gitignored), pointing at a Supabase project
with the migrations in `supabase/migrations` applied. To apply migrations to a linked
project:

```sh
supabase db push --linked
```

To run the Supabase-specific test suites — these hit a real (non-production) hosted Supabase
project and require the three env vars above to be set locally:

```sh
bun run vitest run test/contracts/supabaseRepositories.contract.test.ts test/contracts/supabaseRls.contract.test.ts
```

`supabaseRepositories.contract.test.ts` reruns the same shared repository contract suite
used by the Local adapters against the real Supabase adapters. `supabaseRls.contract.test.ts`
exercises Row Level Security negative cases directly (e.g. a nearby responder cannot read a
medication label, a removed circle member loses read access, a user outside a circle cannot
see its alerts, and only the service role can insert audit events) using real authenticated
Supabase sessions for synthetic test users.

### Known limitations

These are intentional, documented scope decisions or work explicitly deferred to a later
phase — not bugs:

- **No server-side scheduler yet.** Reminder/escalation timing is driven by a local
  in-browser scheduler (`LocalScheduler`). It only advances while a browser tab with the app
  open is running; there is no background job that fires when the tab is closed. A real
  scheduler arrives in Phase 10.
- **No real Twilio integration yet, and Supabase is not the default.** Notifications still go
  through a mock gateway. Supabase-backed repositories exist behind `DATA_ADAPTER=supabase`
  (see "Supabase adapters" above) but the app still defaults to local-only (`localStorage`)
  persistence — there is no cutover yet. That, plus the messaging provider, is Phase 10/11
  scope.
- **Quiet hours are shared across all notification channels.** A user/circle has one quiet-hours
  window that applies to every channel (SMS, push, call, etc.), not a separate window per
  channel. This was a deliberate MVP scope decision, not a gap.
- **The alerts inbox (`/app/alerts`) isn't role-gated yet.** A nearby responder currently sees
  the same recipient/delivery-state list a coordinator sees — names, relationship, stage, and
  channel, though never medicine, diagnosis, or notes. A lighter, responder-specific alert view
  may be worth building later (see Implementation.md §4.4/§13.3), but nothing sensitive leaks
  today.
- **Inbound webhook-shaped duplicate delivery-status callbacks aren't testable yet.** There's
  no webhook receiver in the codebase to exercise — that surface doesn't exist until the real
  Twilio integration lands in Phase 11. The two duplicate-callback paths that do exist today
  (the mock provider's call-response callback, and outbound notification-send idempotency) are
  covered by tests.
