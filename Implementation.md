# Umeed — Detailed Implementation Plan

## 1. Purpose of this document

This document is the complete implementation specification for turning the existing Umeed prototype into a real, UK-focused application. Although it may first be presented at a hackathon, it must be designed as a credible product rather than a staged demonstration.

The implementation agent must assume it has no access to any earlier product conversations. It must read this document completely before changing code.

The project already has a frontend prototype. Preserve useful existing components and styling where practical, but restructure the experience and domain logic around the requirements below.

The implementation must be **local-first in its engineering sequence, not demo-first in its user experience**. Do not connect Supabase, Twilio, an LLM, or another external service during the initial build. First build the real screens, onboarding, authenticated journeys, domain logic and failure handling against local adapters and automated tests. Supabase and real communication services are introduced only after those behaviours are complete and stable.

Local adapters are temporary development infrastructure. Users must never see role-switching controls, seeded scenarios, fake call buttons, accelerated clocks or other demonstration machinery in the application UI.

---

## 2. Product summary

### Working name

**Umeed — Always Near**

### One-line proposition

Umeed notices when an older parent misses an expected routine, checks in gently, and coordinates a trusted nearby person or family member to respond.

### Product position

Umeed is the missing coordination layer between:

- Informal daily family calls and WhatsApp messages; and
- A formal monitored personal-alarm or home-care service.

It is intended for an older adult who remains largely independent but whose family wants a reliable way to notice missed routines, request a check-in, coordinate responsibility, and see that someone is responding.

### What the product is not

Umeed is not:

- An emergency-response service;
- A medical device;
- A medication-prescribing or dosage-advice tool;
- A diagnostic or clinical-triage service;
- A replacement for NHS 111, 999, a GP, a pharmacist or professional care;
- A continuous location-tracking product;
- Proof that a medicine was actually taken;
- A guarantee that an older adult is safe.

The UI must never imply any of the above.

---

## 3. Product principles

Use these principles to resolve ambiguous implementation decisions.

1. **Independence before surveillance.** The older adult is an active participant with control over their information.
2. **Silence is a signal, not a diagnosis.** A missed response can trigger a check-in, but it does not prove that something is wrong.
3. **Coordination is the core value.** The most important product action is “I’m handling this.”
4. **Minimum necessary disclosure.** A neighbour receives only the information required to perform a welfare check.
5. **Rules before AI.** Scheduling, escalation, permissions and emergency guidance must be deterministic.
6. **One clear action per screen.** The older-adult experience must be particularly simple.
7. **Failure is expected.** Calls fail, notifications are delayed, people do not respond and callbacks are duplicated. Design for this.
8. **Accessibility is a requirement.** Large targets, readable type, strong contrast, plain English and keyboard/screen-reader support are mandatory.
9. **Build a real product, not a clickable scenario.** Every screen must belong to a genuine user journey, and every action must operate through the same domain rules intended for production.
10. **Testability must be invisible to users.** Fake clocks, fixtures and mock providers belong in automated tests and developer tooling, never in normal product screens.

---

## 4. Users and roles

### 4.1 Older adult

The person whose routines and check-ins are being coordinated. They can:

- View their next routine;
- Acknowledge a routine;
- Request help;
- See who is responding;
- View and manage their care circle where appropriate;
- Control consent and information-sharing permissions;
- Remove access previously granted to a member.

### 4.2 Family coordinator

The main family member who creates the care circle and configures routines, with the older adult’s permission. They can:

- Configure routines and escalation policies;
- Invite family members and trusted responders;
- Receive alerts;
- Claim an alert;
- Record an outcome;
- View permitted history;
- Manage contact order and communication preferences.

### 4.3 Family member

A sibling, child or other relative who can receive alerts and claim responsibility. Access depends on permissions.

### 4.4 Nearby trusted responder

A neighbour, friend or nearby relative who may be asked to check in physically. By default they can see only:

- The older adult’s first name;
- The request to make contact or check in;
- The response deadline;
- The ability to accept, decline or report an outcome;
- Contact/address details explicitly shared for this purpose.

They must not automatically see medicine names, diagnoses, readings, private notes or the complete family timeline.

---

## 5. Primary reference scenario

Use this scenario as development fixture data and for automated end-to-end tests. Do not hard-code the names or events into product components, and do not expose a scenario launcher in the application.

1. Margaret is 74 and lives independently in London.
2. Her daughter Sarah lives in Manchester.
3. Her son Daniel is also part of the family circle.
4. Margaret’s neighbour Priya is the first nearby responder.
5. Margaret has a 9:00 AM morning routine called “Morning check-in and tablets.”
6. Margaret does not acknowledge the first reminder.
7. Umeed retries through a simulated phone call.
8. Margaret still does not respond.
9. Priya receives a minimal welfare-check request.
10. Priya selects **I’m handling this**.
11. Sarah and Daniel immediately see that Priya is responding and do not duplicate the response.
12. Priya records “Spoke to Margaret — she is okay.”
13. The alert is resolved and retained in the activity history.

Also cover a second automated test scenario where Margaret presses **I need help**, causing the normal reminder stages to be bypassed.

---

## 6. Scope

### 6.1 Must-have MVP capabilities

1. Real sign-up, sign-in, sign-out, session restoration and password-reset screens behind an authentication interface;
2. Older-adult profile;
3. First-time onboarding for a family coordinator and an older adult;
4. Invitation acceptance for family members and nearby responders;
5. Care circle with family and nearby responders;
6. Granular permissions and older-adult consent;
7. Recurring routines;
8. Routine occurrence generation;
9. Acknowledgement through the UI;
10. Missed-routine detection;
11. Configurable escalation policy;
12. Communication abstraction with mock providers during local development;
13. Immediate help request;
14. Alert claiming through “I’m handling this”;
15. Claim expiry and escalation resumption;
16. Resolution outcomes;
17. Live state updates between signed-in users;
18. Activity timeline and audit history;
19. UK emergency guidance;
20. Account, notification and privacy settings;
21. Unit, integration and end-to-end tests.

### 6.2 Later production integrations

- Supabase Auth;
- Supabase Postgres;
- Supabase Row Level Security;
- Supabase Realtime;
- Supabase Edge Functions and scheduled jobs;
- Twilio Voice and SMS;
- Push notifications;
- Transactional email;
- Error monitoring and analytics.

### 6.3 Explicitly out of scope

Do not implement:

- NHS login or NHS patient-record access;
- GP-system integrations;
- Prescription ordering;
- Medicine interactions or dosage recommendations;
- Advice about what to do after a missed dose;
- Medical diagnosis or symptom triage;
- Automatic calls to 999 or NHS 111;
- Fall detection;
- Wearables;
- Continuous GPS tracking;
- Care-agency workforce management;
- Payments or subscriptions;
- Nationwide care-provider directories;
- Full support for different legal and health pathways across all UK nations;
- An unrestricted AI chatbot.

---

## 7. Required user experience

### 7.1 Landing page

The landing page must communicate the proposition within ten seconds.

Recommended hero:

**Support their independence. Know when to step in.**

“Umeed helps families notice missed routines, check in gently, and coordinate someone nearby when an older parent does not respond.”

Primary CTA: **Get started**

Secondary CTA: **Sign in**

The page must explain:

- The gap between informal family calls and emergency alarms;
- That Umeed supports independent living;
- How missed routine escalation works;
- That Umeed is not an emergency service;
- That the older adult controls who can see their information.

Avoid stock phrases such as “monitor your elderly loved ones.” Use “older parent,” “older adult,” “family member” or the person’s name.

### 7.2 Authentication and account entry

Implement normal application entry screens from the beginning. The UI must not offer a role selector.

Required screens and behaviours:

- Sign up with name, email and password;
- Email verification pending state;
- Sign in;
- Forgot-password request;
- Reset-password screen;
- Session restoration after refresh;
- Sign out;
- Expired-session handling;
- Invitation acceptance when the user arrives through a valid invite link;
- Clear handling when an invitation is expired, revoked or addressed to another account.

During the local-development phases, these screens use a `LocalAuthProvider` that imitates the production session contract. It may provide documented fixture credentials for automated testing, but it must not expose one-click role switching in the product UI.

The authenticated user’s role comes from active care-circle membership, not from a client-controlled dropdown or URL parameter. One account may belong to more than one care circle and may have a different role in each.

### 7.3 First-time onboarding

After account creation, guide the user through a real onboarding flow.

### Coordinator creates a circle

1. Explain Umeed’s purpose and safety boundary;
2. Ask whom the user wants to support;
3. Capture the older adult’s preferred name and contact method;
4. Explain that the older adult must know about and agree to the arrangement;
5. Create the care circle in `pending_consent` state;
6. Invite the older adult by email/SMS link or generate a printable/manual setup code;
7. Do not activate routine escalation until required consent is recorded;
8. Invite additional family or trusted nearby responders;
9. Configure the first routine;
10. Review and activate the circle.

### Older adult accepts

1. Open invitation;
2. Verify identity using the configured authentication flow;
3. View who created the circle and what Umeed will do;
4. Review communication channels and information sharing;
5. Accept, decline or request changes;
6. Set preferred contact and accessibility options;
7. Confirm emergency-service disclaimer;
8. Activate the circle after consent.

### Invited family member or nearby responder accepts

1. Open invitation and authenticate;
2. See the inviter, older adult and proposed role;
3. Review exactly what information will be visible;
4. Accept or decline;
5. Configure availability and notification channel;
6. Join the active circle only after acceptance.

### 7.4 Older-adult home

This is the simplest screen in the product. It must include:

- Greeting using the preferred name;
- Current date and simple status;
- Next routine title and time;
- One large **Done** button;
- One large **I need help** button;
- Optional **Call my family** action;
- Current response state if an alert is active;
- Simple confirmation after acknowledgement.

Do not show dense charts, compliance percentages, medical risk scores or complicated navigation.

Use “Done” or “I’ve done this,” not “Medication verified.” Internally record an acknowledgement; do not claim independent proof of medicine consumption.

### 7.5 Family dashboard

The dashboard must answer three questions immediately:

1. Is Margaret currently okay based on expected responses?
2. Is there an unresolved concern?
3. Who is handling it?

Required elements:

- Older-adult status card: `All okay`, `Awaiting response`, `Checking in`, `Help requested`, `Someone responding`, or `Needs attention`;
- Last acknowledged routine;
- Next scheduled routine;
- Active alert card;
- Current escalation stage;
- Notification delivery states;
- Responder name and claim-expiry countdown;
- **I’m handling this** action when unclaimed;
- Recent activity timeline;
- Care-circle summary;
- Routine-management entry point.

Do not use red for a routine that is merely due. Reserve red for a direct help request, a fully exhausted escalation or a state requiring immediate human attention.

### 7.6 Trusted responder view

Required elements:

- A minimal request: “Margaret has not responded to her morning check-in.”;
- Time since the expected response;
- **I can check**, **I can call**, and **I’m unavailable** actions;
- Address/contact information only if permission was granted;
- Resolution choices;
- No medicine or diagnosis details by default.

### 7.7 Routine builder

Supported types:

- General check-in;
- Medication acknowledgement;
- Meal;
- Hydration;
- Appointment preparation;
- Movement/activity;
- Custom routine.

Fields:

- Title;
- Optional plain-language description;
- Routine type;
- Local time;
- Days of week;
- Start and optional end date;
- Grace period;
- Enabled/paused state;
- Notification channels;
- Escalation policy;
- Visibility level.

For medication routines, allow the user to enter a label supplied by them. Do not infer dosage or produce instructions.

### 7.8 Care-circle management

Display members in escalation order. Each member requires:

- Name;
- Relationship;
- Role;
- Phone/email placeholders;
- Nearby/not-nearby indicator;
- Preferred contact method;
- Availability window;
- Escalation priority;
- Data permissions;
- Active/invited/declined/removed status.

Allow reorder controls, but changes must produce an audit event.

### 7.9 Active alert screen

Required content:

- What expected event was missed;
- The factual timeline;
- Who has been contacted;
- Delivered/failed/accepted/declined status per contact;
- Current owner;
- Claim-expiry time;
- Available actions;
- UK emergency guidance;
- Resolution form.

Never present a generated medical conclusion.

### 7.10 Resolution form

Supported outcomes:

- Spoke to the older adult — all okay;
- Checked in person — all okay;
- Older adult asked for family contact;
- Professional/medical assistance was contacted by the responder;
- Unable to reach;
- False or accidental alert;
- Other, with a short note.

The application records what the responder says happened. It does not verify the medical status.

### 7.11 Consent and privacy screen

The older adult must be able to review:

- Care-circle members;
- Who receives alerts;
- Who can view routine names;
- Who can view medication labels;
- Who can view notes;
- Whether automated calls are enabled;
- Whether address/contact details can be shared with the nearby responder;
- Retention and deletion options;
- Consent history;
- How to revoke a person’s access.

---

## 8. Domain model

Use stable UUID-style string identifiers in local and remote implementations.

### 8.1 Core entities

#### UserProfile

- `id`
- `displayName`
- `preferredName`
- `phone`
- `email`
- `timezone`
- `locale`
- `accessibilityPreferences`
- `onboardingStatus`
- `createdAt`
- `updatedAt`

Do not store a single global role on the profile. Authorisation comes from the user’s membership in each care circle.

#### CareCircle

- `id`
- `name`
- `olderAdultId`
- `coordinatorId`
- `status`
- `createdAt`
- `updatedAt`

Valid circle statuses should include `draft`, `pending_consent`, `active`, `paused`, `closed` and `deleted_pending_retention`.

#### CircleMember

- `id`
- `careCircleId`
- `userId`
- `relationship`
- `responderType`: `older_adult | family | nearby_responder | coordinator`
- `isNearby`
- `priority`
- `availability`
- `preferredChannel`
- `membershipStatus`
- `createdAt`
- `updatedAt`

#### MemberPermission

- `id`
- `circleMemberId`
- `canViewRoutineStatus`
- `canViewRoutineNames`
- `canViewMedicationLabels`
- `canViewNotes`
- `canViewAddress`
- `canReceiveAlerts`
- `canManageRoutines`
- `canManageCircle`
- `grantedAt`
- `revokedAt`

#### Invitation

- `id`
- `careCircleId`
- `invitedByUserId`
- `invitedEmail` or `invitedPhone`
- `proposedResponderType`
- `proposedRelationship`
- `tokenHash`
- `status`: `pending | accepted | declined | expired | revoked`
- `expiresAt`
- `acceptedByUserId`
- `acceptedAt`
- `revokedAt`
- `createdAt`

Never persist a reusable plain-text invitation token. Store only a secure hash in the production database. Joining a circle must require a valid, unexpired, unrevoked invitation and authenticated identity checks.

#### Routine

- `id`
- `careCircleId`
- `olderAdultId`
- `type`
- `title`
- `description`
- `timezone`
- `localTime`
- `daysOfWeek`
- `startDate`
- `endDate`
- `gracePeriodMinutes`
- `visibility`
- `enabled`
- `createdBy`
- `createdAt`
- `updatedAt`

#### RoutineOccurrence

- `id`
- `routineId`
- `scheduledForUtc`
- `scheduledLocalDate`
- `status`
- `acknowledgedAt`
- `acknowledgedBy`
- `acknowledgementChannel`
- `alertId`
- `createdAt`
- `updatedAt`

Add a uniqueness rule for `routineId + scheduledForUtc`.

#### EscalationPolicy

- `id`
- `routineId`
- `name`
- `enabled`
- `steps`
- `createdAt`
- `updatedAt`

Each step contains:

- `order`
- `delayMinutes`
- `recipientType` or explicit recipient ID;
- `channel`
- `responseWindowMinutes`
- `fallbackBehaviour`

#### Alert

- `id`
- `careCircleId`
- `occurrenceId` or null for direct help;
- `source`: `missed_routine | direct_help | manual`
- `status`
- `severity`
- `currentStage`
- `openedAt`
- `claimedAt`
- `claimedBy`
- `claimExpiresAt`
- `resolvedAt`
- `resolvedBy`
- `resolutionCode`
- `resolutionNote`
- `updatedAt`

#### AlertRecipient

- `id`
- `alertId`
- `circleMemberId`
- `channel`
- `stage`
- `deliveryStatus`
- `providerReference`
- `sentAt`
- `deliveredAt`
- `respondedAt`
- `response`

#### CommunicationEvent

- `id`
- `alertId`
- `occurrenceId`
- `recipientId`
- `channel`: `in_app | push | sms | voice | email`
- `direction`
- `providerReference`
- `status`
- `attemptNumber`
- `errorCode`
- `createdAt`
- `updatedAt`

#### ConsentRecord

- `id`
- `careCircleId`
- `subjectUserId`
- `consentType`
- `policyVersion`
- `status`
- `grantedAt`
- `revokedAt`
- `recordedBy`

#### NotificationPreference

- `id`
- `userId`
- `careCircleId`
- `channel`
- `enabled`
- `quietHoursStart`
- `quietHoursEnd`
- `timezone`
- `urgentAlertsOverrideQuietHours`
- `createdAt`
- `updatedAt`

#### AuditEvent

- `id`
- `careCircleId`
- `actorId`
- `actorType`
- `action`
- `entityType`
- `entityId`
- `timestamp`
- `metadata`

Audit metadata must not contain secrets or unnecessary health details.

---

## 9. State machines

### 9.1 Routine occurrence states

- `scheduled`
- `awaiting_response`
- `acknowledged`
- `missed`
- `escalating`
- `resolved`
- `cancelled`

Allowed transitions:

- `scheduled -> awaiting_response`
- `scheduled -> cancelled`
- `awaiting_response -> acknowledged`
- `awaiting_response -> missed`
- `missed -> acknowledged` if late acknowledgement is permitted;
- `missed -> escalating`
- `escalating -> acknowledged` with an audit event;
- `escalating -> resolved`
- `any non-final state -> cancelled` only through an authorised action.

Invalid transitions must be rejected by domain logic, not merely hidden in the UI.

### 9.2 Alert states

- `open`
- `notifying`
- `unclaimed`
- `claimed`
- `resolved`
- `unresolved`
- `cancelled`

Allowed transitions:

- `open -> notifying`
- `notifying -> unclaimed`
- `notifying -> claimed`
- `unclaimed -> claimed`
- `claimed -> unclaimed` when claim expires;
- `claimed -> resolved`
- `unclaimed -> unresolved` when escalation is exhausted;
- `open/notifying/unclaimed -> cancelled` when the older adult acknowledges and policy permits cancellation.

### 9.3 Claim behaviour

- Only one active claim is allowed per alert.
- Claim creation must be atomic in the remote implementation.
- If two people claim simultaneously, the first valid persisted claim wins.
- The losing user receives a friendly message identifying who is handling it.
- A claim has an expiry time.
- The owner can extend, hand over or release the claim.
- When a claim expires, record an audit event and resume escalation.
- Resolving an alert stops pending notification jobs.

---

## 10. Default escalation behaviour

All timings must be configurable. Seed the following production-style policy:

1. Routine due: send in-app reminder.
2. After 10 minutes with no acknowledgement: retry with mock voice call.
3. After another 10 minutes: alert first available nearby responder.
4. If not accepted within 5 minutes: notify family coordinator.
5. If still unclaimed after 5 minutes: notify remaining family members.
6. If someone claims: pause further escalation.
7. If the claim expires: resume at the next step.
8. If the sequence is exhausted: mark `unresolved` and display urgent human-action guidance.

Automated tests may advance an injected fake clock to exercise this sequence quickly. Normal application runs must always use real elapsed time and the configured production policy.

### Direct help behaviour

When the older adult selects **I need help**:

- Create an alert with source `direct_help`;
- Skip standard reminder and retry stages;
- Notify the nearby responder and coordinator immediately;
- Show a confirmation to the older adult;
- Show call links for family, NHS 111 and 999 with clear wording;
- Do not automatically call emergency services;
- Do not attempt clinical triage.

---

## 11. Local-first architecture

The domain layer must not import Supabase, Twilio, browser storage or React.

Recommended logical structure; adapt names to the existing repository rather than forcing this exact tree:

```text
src/
  domain/
    entities/
    state-machines/
    services/
    policies/
    errors/
  application/
    use-cases/
    ports/
  infrastructure/
    local/
    mock-communications/
    supabase/             # create only in the final integration phase
    twilio/               # create only in the final integration phase
  features/
    older-adult/
    family-dashboard/
    alerts/
    routines/
    care-circle/
    consent/
    authentication/
    onboarding/
    settings/
  shared/
    components/
    accessibility/
    time/
    validation/
  test/
    fixtures/
    builders/
    fakes/
```

### 11.1 Required ports/interfaces

Define explicit interfaces before concrete storage or communication code:

- `ProfileRepository`
- `CareCircleRepository`
- `RoutineRepository`
- `OccurrenceRepository`
- `AlertRepository`
- `ConsentRepository`
- `AuditRepository`
- `UnitOfWork` or equivalent atomic-operation boundary;
- `NotificationGateway`
- `Clock`
- `IdGenerator`
- `EventBus`
- `SessionProvider`
- `InvitationRepository`
- `AuthProvider`

Every UI feature and use case depends on these interfaces. Local and Supabase implementations must satisfy the same contract tests.

### 11.2 Local repository

Use local persistence appropriate to the existing stack. IndexedDB is preferred for structured local-development state; localStorage is acceptable only if the existing app is small and all data is validated on read.

Requirements:

- Version stored data;
- Validate deserialised data;
- Provide migrations or safely reset incompatible development data;
- Preserve state across refreshes;
- Publish local events after writes;
- Support test fixture setup outside the production UI;
- Never use real health or contact data in local fixtures.

### 11.3 Local authentication adapter

Implement a `LocalAuthProvider` against the same interface later used by Supabase Auth.

It must support:

- Account registration;
- Sign in and sign out;
- Session restoration;
- Local email-verification state;
- Password-reset state;
- Invitation-token validation;
- Expired and revoked invitations;
- Route guards;
- Multiple separate fixture accounts for automated tests.

Passwords used by the local adapter are disposable development fixtures. Do not design custom production password storage or authentication cryptography. Supabase Auth replaces this adapter before real users or data are permitted.

### 11.4 Clock abstraction

Never call `Date.now()` directly inside domain logic. Inject a `Clock`.

Implement:

- `SystemClock` for normal local use;
- Test fake clock with exact, deterministic time advancement.

Use `SystemClock` in every normal application run. The fake clock may be injected only through tests or explicitly invoked developer scripts; it must not be accessible through the product UI.

### 11.5 Scheduler abstraction

Before Supabase, implement a local scheduler that:

- Runs while the application is open;
- Checks due work at a short interval;
- Delegates all decisions to idempotent domain use cases;
- Can be triggered from automated tests or developer scripts;
- Never embeds escalation decisions in React components.

The local scheduler exists to test the application before Supabase. It is not sufficient for real users because it stops when the application is closed. The application must not be considered deployable to users until server-side scheduling is implemented.

### 11.6 Mock communications

Implement a `MockNotificationGateway` that supports:

- In-app notification;
- Push simulation;
- SMS simulation;
- Voice-call simulation;
- Email simulation;
- Configurable success, delay and failure;
- Provider-style reference IDs;
- Delivery-status callbacks;
- Duplicate callback simulation;
- Keypad responses such as `1`, `2` and `3`;
- A communication log available only to automated tests and development diagnostics.

This allows the full communication lifecycle to be tested before real providers are introduced.

---

## 12. Time, recurrence and idempotency requirements

- Store machine timestamps in UTC.
- Store the routine’s IANA timezone separately, normally `Europe/London`.
- Store the intended local time separately from generated UTC occurrences.
- A 9:00 AM routine must remain at 9:00 AM local time when UK daylight saving changes.
- Do not generate occurrences by repeatedly adding 24 hours in UTC.
- Generate each occurrence using the routine’s local date/time and timezone.
- Enforce uniqueness for `routineId + scheduledForUtc`.
- Processing the same due occurrence twice must not send duplicate notifications.
- Processing the same provider callback twice must not cause duplicate transitions.
- Use idempotency keys for communication attempts.
- Persist or locally record a job/action ledger so retries are distinguishable from duplicates.

---

## 13. Safety, privacy and permissions

### 13.1 Required language

Include this or equivalent wording in relevant places:

“Umeed helps families coordinate check-ins. It is not an emergency or medical service and cannot confirm that someone is safe.”

Emergency guidance:

- “Call 999 for a life-threatening emergency.”
- “Use NHS 111 if you need urgent medical help and it is not a life-threatening emergency.”

### 13.2 Health information

Medication names, health readings and health-related notes may be health data. Treat these as sensitive fields.

- Do not expose them through URLs, logs or analytics events.
- Do not send them to a nearby responder by default.
- Do not use them in mock notification text unless a test explicitly checks authorised disclosure.
- Do not place secrets or sensitive data in client-visible environment variables.
- Use synthetic data in development and testing.

### 13.3 Permission enforcement

Do not rely only on hidden UI elements. Use application-level permission checks, then enforce the same policy through Supabase RLS in the final phase.

Test negative cases:

- Nearby responder attempts to view medication label;
- Removed member attempts to view the circle;
- Family member attempts to manage routines without permission;
- User from another circle requests an alert;
- Revoked permission remains cached in an open page.

---

## 14. Accessibility requirements

- Minimum 44 x 44 CSS pixel interactive targets;
- No critical action conveyed through colour alone;
- WCAG AA colour contrast;
- Visible keyboard focus;
- Semantic headings and landmarks;
- Form labels and accessible error messages;
- Live-region announcement for alert/status changes where helpful;
- Screen-reader text for icons;
- Support browser text zoom to 200%;
- Avoid small grey text;
- Avoid countdown-only decisions; include actual time;
- Confirmation after every older-adult action;
- Respect reduced-motion preferences;
- Avoid timeouts that cannot be extended, except clearly communicated safety-related claim windows.

---

## 15. Analytics and product events

Create a typed analytics interface but use a local logger until a provider is selected. Do not send health details or notification content.

Suggested events:

- `onboarding_started`
- `care_circle_switched`
- `signup_completed`
- `invitation_sent`
- `invitation_accepted`
- `routine_created`
- `routine_due`
- `routine_acknowledged`
- `routine_missed`
- `alert_opened`
- `escalation_stage_changed`
- `alert_claimed`
- `claim_expired`
- `alert_resolved`
- `help_requested`
- `notification_attempted`
- `notification_delivered`
- `notification_failed`
- `consent_granted`
- `consent_revoked`

Include entity IDs only if they are random internal identifiers. Do not include names, medicine labels, notes, phone numbers or addresses.

---

## 16. Detailed implementation phases

Complete phases sequentially. At the end of every phase:

1. Run the repository’s formatter, linter, type checker and relevant tests;
2. Fix failures introduced by the phase;
3. Verify the stated acceptance criteria;
4. Update this document’s implementation-status checklist if useful;
5. Commit only the files related to that phase;
6. Use the suggested commit message or a close conventional equivalent;
7. Do not begin the next phase with a dirty working tree unless pre-existing user changes have been documented and preserved.

### Phase 0 — Repository audit and baseline

Actions:

- Read `README`, package scripts, environment examples and existing architectural notes;
- Inspect the framework, routing, state management, styling, test tooling and current data flow;
- Run the existing app locally;
- Run all existing checks before modifying anything;
- Inventory current Umeed screens, components, routes and mock data;
- Identify reusable components and obsolete flows;
- Check for existing Supabase coupling, but do not expand it;
- Record pre-existing failures separately;
- Add missing test tooling only if necessary and compatible with the project.

Deliverable:

- A short repository audit in the implementation agent’s response or a project note;
- An exact mapping between existing files and the phases below.

Acceptance criteria:

- Existing baseline behaviour is understood;
- Existing build/test status is recorded;
- No feature behaviour has changed.

Commit: `chore: document umeed implementation baseline`

### Phase 1 — Domain foundations and local adapters

Actions:

- Define domain types and schemas;
- Define repository and gateway interfaces;
- Implement domain errors and result handling;
- Implement injected clock and ID generator;
- Implement local repositories;
- Implement local event bus;
- Implement data versioning and seeded fixtures;
- Add repository contract tests;
- Add fixture setup and reset scripts for automated tests only;
- Implement the `LocalAuthProvider` contract.

Acceptance criteria:

- Data survives refresh;
- Test fixture reset restores a known exact state;
- Invalid stored data is handled safely;
- Domain code imports no React, Supabase or Twilio modules;
- Normal users cannot change identity or role without authentication;
- Repository contract tests pass.

Commit: `feat: add local-first umeed domain foundation`

### Phase 2 — Product shell, authentication and onboarding

Actions:

- Update branding to “Umeed — Always Near”;
- Implement or refine landing page;
- Build sign-up, sign-in, sign-out, verification, forgotten-password and reset-password screens;
- Restore local sessions on refresh;
- Implement protected routes;
- Build coordinator, older-adult and invited-member onboarding journeys;
- Implement invitation acceptance, decline, expired and revoked states;
- Derive navigation from authenticated care-circle membership;
- Add safety footer/disclaimer;
- Ensure responsive mobile-first layout;
- Add shared status badge and timeline components;
- Remove or hide primary navigation for out-of-scope health features.

Acceptance criteria:

- A new coordinator can register and create a pending care circle;
- An older adult can accept or decline an invitation and record consent;
- A family member or responder can accept an invitation and set availability;
- Signing out prevents protected-route access;
- Session restoration works after refresh;
- Role and circle access cannot be changed through client route manipulation;
- Landing proposition is understandable without explanation;
- Navigation is keyboard accessible.

Commit: `feat: restructure umeed around coordinated check-ins`

### Phase 3 — Care circle, consent and permissions

Actions:

- Build care-circle summary and management screens;
- Implement member roles and escalation priority;
- Implement granular permission settings;
- Implement consent records and revocation;
- Implement permission guards in use cases and routes;
- Add audit events for membership, order and permission changes;
- Show a minimal trusted-responder view.

Acceptance criteria:

- Priya cannot view Margaret’s medication label by default;
- Sarah can manage routines as coordinator;
- Daniel’s actions reflect seeded permissions;
- Revoking a permission takes effect immediately;
- Every permission mutation has an audit event.

Commit: `feat: add consent-aware care circle management`

### Phase 4 — Routines and acknowledgements

Actions:

- Build routine list and routine builder;
- Implement schedule validation;
- Generate occurrences in the correct timezone;
- Build older-adult home screen;
- Implement acknowledgement use case;
- Add success and already-acknowledged handling;
- Add recent activity timeline;
- Cover daylight-saving and duplicate-generation cases.

Acceptance criteria:

- A 9:00 AM London routine stays at 9:00 AM across DST;
- Occurrence generation is idempotent;
- Margaret can acknowledge through one large action;
- The family dashboard reflects the acknowledgement;
- UI says acknowledged/done, never clinically verified.

Commit: `feat: implement routines and acknowledgements`

### Phase 5 — Escalation engine and alert ownership

Actions:

- Implement occurrence and alert state machines;
- Implement configurable escalation policies;
- Implement alert creation for missed routines;
- Implement recipient selection by availability and priority;
- Implement atomic-style local claim operation;
- Implement claim expiry, release and handover;
- Implement resolution outcomes;
- Stop pending local jobs after resolution;
- Add the full alert timeline.

Acceptance criteria:

- Invalid transitions fail predictably;
- Two simultaneous claims cannot both win;
- Claim expiry resumes escalation;
- Resolution stops further notification attempts;
- Every transition produces a single audit event.

Commit: `feat: add deterministic escalation and alert ownership`

### Phase 6 — Mock communications and direct help

Actions:

- Implement mock notification gateway;
- Implement simulated delivery callbacks;
- Implement voice-call keypad simulation;
- Map keypad `1` to acknowledgement;
- Map keypad `2` to help request;
- Map keypad `3` to replay without changing state;
- Implement simulated failed call and SMS fallback;
- Build direct-help flow;
- Add communication delivery states to the alert screen;
- Add UK emergency guidance.

Acceptance criteria:

- A mock call response of `1` acknowledges the occurrence;
- `2` creates or promotes a direct-help alert;
- Duplicate callbacks have no duplicate effect;
- Failed voice call follows the configured fallback;
- Direct help bypasses the normal reminder stages;
- Umeed never automatically calls 999 or 111.

Commit: `feat: simulate multichannel check-ins and help requests`

### Phase 7 — Complete real-world journeys and experience polish

Actions:

- Complete account, profile and notification settings;
- Add care-circle switching for users who belong to multiple circles;
- Add pending invitation and incomplete-onboarding states;
- Add account removal and leave-circle request flows with safe confirmation;
- Add notification preference and quiet-hours configuration;
- Add pause/resume controls for routines and the care circle;
- Add loading, empty, error and offline states;
- Add user-friendly race-condition messages;
- Audit responsive layout and accessibility;
- Add in-product guidance and empty-state education where necessary;
- Ensure every user journey works without seeded names or hard-coded IDs;
- Move all fixture manipulation and time advancement into tests or developer scripts.

Acceptance criteria:

- A real user can move from account creation to an active, consented care circle;
- Invitees can join without support from a developer;
- Multiple care circles are isolated and navigable;
- No real external messages are sent while the mock adapter is configured;
- Normal user screens expose no mock provider, fixture or clock controls;
- Mobile and desktop product journeys work.

Commit: `feat: complete umeed account and care journeys`

### Phase 8 — Test hardening and local release gate

Actions:

- Complete unit, integration and end-to-end coverage;
- Test all permission-denial paths;
- Test scheduler idempotency;
- Test duplicate callbacks;
- Test DST boundaries;
- Test claim race and claim expiry;
- Test persistence migration/reset;
- Run an accessibility scan where supported;
- Remove dead code and console logging containing data;
- Document local setup, fixture accounts and test commands in `README`;
- Produce a concise known-limitations section.

Local release gate:

- Build passes;
- Type check passes;
- Lint passes;
- Unit/integration tests pass;
- End-to-end product journeys pass;
- No secrets exist in the repository;
- No Supabase or Twilio dependency is required to run the complete local test suite;
- No fake identity switcher or scenario-control UI exists in the application.

Commit: `test: harden local umeed experience`

### Phase 9 — Supabase design, without cutover

Do not start this phase until the local release gate passes.

Actions:

- Map domain entities to relational tables;
- Write additive migrations;
- Define indexes and uniqueness constraints;
- Define RLS policies;
- Define server-side functions needed for atomic claims;
- Design realtime subscriptions;
- Design scheduled occurrence and escalation processing;
- Add environment validation;
- Implement Supabase repository adapters behind existing interfaces;
- Add adapter contract tests against a local or dedicated test Supabase environment;
- Keep the local adapter selectable.

Required database constraints:

- Unique routine occurrence per routine and scheduled timestamp;
- One active claim per alert;
- Foreign-key integrity for circles, members, routines and alerts;
- Valid enumerated states or check constraints;
- Idempotency-key uniqueness for external communication attempts;
- Timestamps controlled server-side for security-sensitive mutations.

RLS principles:

- A user can access only circles in which they are an active member;
- Sensitive columns require permission-aware views/RPCs or carefully scoped policies;
- A nearby responder cannot retrieve medicine labels by default;
- Removed/revoked members lose access immediately;
- Service-role operations are restricted to backend functions;
- Never expose a service-role key to the browser.

Acceptance criteria:

- Every repository adapter passes the same contract suite as the local adapter;
- RLS negative tests pass;
- Migrations can be applied from a clean database;
- Local mode still works unchanged;
- No UI component imports the Supabase client directly.

Commit: `feat: add supabase adapters behind domain ports`

### Phase 10 — Supabase cutover and server-side scheduling

Actions:

- Enable Supabase adapter through environment configuration;
- Replace `LocalAuthProvider` with Supabase Auth through the existing interface;
- Connect the already-built invitation and onboarding journeys to real tokens and accounts;
- Move authoritative scheduling to server-side scheduled functions;
- Use an atomic claim function/RPC;
- Enable Realtime for relevant non-sensitive changes;
- Re-fetch permissions on membership or consent changes;
- Retain local adapters for automated tests and isolated development;
- Add operational job logging without sensitive content.

Acceptance criteria:

- Two browser sessions update when an alert is claimed;
- Atomic claim race test passes;
- Scheduled jobs are idempotent;
- Authenticated cross-circle access is denied;
- Revoked access disappears without relying solely on client state;
- Local automated tests remain available without Supabase.

Commit: `feat: enable supabase persistence and realtime coordination`

### Phase 11 — Real communications integration

Only begin this after Supabase persistence and server-side processing are reliable.

Actions:

- Implement Twilio adapter server-side;
- Keep account credentials in server secrets;
- Implement outbound voice call;
- Implement keypad response webhook;
- Implement SMS notification;
- Validate webhook signatures;
- Store provider IDs and delivery status;
- Make callbacks idempotent;
- Configure retry/fallback behaviour;
- Add rate limits and per-environment recipient allowlists;
- In non-production environments, restrict all real messages to approved test numbers;
- Keep mock communications selectable in local development and automated tests.

Suggested voice script:

“Hello Margaret. This is your Umeed morning check-in. Press 1 if everything is okay. Press 2 if you would like someone to contact you. Press 3 to hear this message again.”

Do not use a free-form voice agent for the MVP. Deterministic keypad input is more reliable, accessible to many landline users and safer.

Acceptance criteria:

- No provider secret reaches the frontend;
- Test allowlist prevents accidental messaging;
- Call status is reflected in the alert timeline;
- Keypad response changes state once only;
- Invalid webhook signatures are rejected;
- Provider outage triggers a documented fallback path;
- Mock mode remains usable for automated tests and local development.

Commit: `feat: add secure voice and sms communication adapters`

### Phase 12 — Final verification and deployment readiness

Actions:

- Run the complete test suite in local and Supabase modes;
- Test with two or more concurrent sessions;
- Test real communication only with approved test recipients;
- Review environment variables and secrets;
- Review RLS with negative tests;
- Check logs for personal or health data leakage;
- Verify privacy, safety and emergency language;
- Verify accessibility manually and automatically;
- Verify local test fixtures and mock-provider mode;
- Document deployment, rollback and provider-disable procedures;
- Document limitations and production work still required.

Commit: `chore: prepare umeed application for release validation`

---

## 17. Test specification

### 17.1 Unit tests

At minimum cover:

- Valid and invalid occurrence transitions;
- Valid and invalid alert transitions;
- Routine occurrence generation;
- DST start and end in `Europe/London`;
- Grace-period calculation;
- Escalation recipient ordering;
- Availability filtering;
- Claim creation;
- Claim conflict;
- Claim expiry;
- Resolution stopping pending actions;
- Permission decisions;
- Redaction for trusted responders;
- Direct-help escalation bypass;
- Idempotency-key generation.
- Invitation expiry and revocation;
- Care-circle activation only after required consent;
- Membership-derived role decisions;
- Session-expiry handling.

### 17.2 Repository contract tests

Run the same suite against local and Supabase repositories:

- Create/read/update;
- Query by circle and status;
- Unique occurrence enforcement;
- Atomic claim behaviour;
- Audit append behaviour;
- Revocation behaviour;
- Isolation between circles;
- Transaction rollback or equivalent failure safety.

### 17.3 Integration tests

- Scheduler creates due occurrence once;
- Missed occurrence creates one alert;
- Escalation sends each intended attempt once;
- Mock call `1` acknowledges;
- Mock call `2` requests help;
- Duplicate notification callback is ignored;
- Failed call initiates fallback;
- Claim pauses escalation;
- Claim expiry resumes escalation;
- Resolution cancels pending work;
- Permission revoke invalidates visible data;
- Realtime/local event updates another open view.
- Registration creates an account without automatically granting circle access;
- Valid invitation acceptance creates the intended membership once;
- Expired, revoked and already-used invitations are rejected;
- Older-adult consent activates a pending circle;
- Sign-out and expired sessions block protected routes.

### 17.4 End-to-end tests

1. A new coordinator signs up and creates a pending care circle;
2. The older adult accepts the invitation, records consent and activates the circle;
3. A nearby responder accepts an invitation and configures availability;
4. Complete the Margaret missed-routine scenario;
5. Margaret acknowledges on time;
6. Margaret acknowledges through mock telephone keypad;
7. Margaret presses direct help;
8. Priya declines and family is contacted;
9. Two responders attempt to claim simultaneously;
10. Claim expires and escalation continues;
11. Sarah resolves an alert;
12. Priya is denied sensitive routine information;
13. A signed-out user cannot access a protected circle route;
14. Test teardown and fixture setup restore the exact isolated test state.

### 17.5 Failure and edge cases

- Browser refresh during an active alert;
- Application closed and reopened;
- Offline action followed by reconnect;
- Communication provider timeout;
- Duplicate and out-of-order callback;
- Routine edited after its occurrence was generated;
- Routine paused while alert is active;
- Member removed while they own an alert;
- Clock change and DST transition;
- Empty care circle;
- No nearby responder available;
- Every responder declines;
- Older adult acknowledges after escalation starts;
- Direct help pressed repeatedly;
- Malformed local persisted data.

---

## 18. Security checklist

- No production secrets in source control;
- `.env.example` contains names and explanations but no real values;
- Client environment variables contain only public configuration;
- Server secrets are accessed only by server-side code;
- RLS enabled on all user-data tables;
- Service-role key never reaches the browser;
- Webhook signatures validated;
- Rate limiting for help requests, invitations and communication attempts;
- Input validated at UI and application boundaries;
- Output encoded by framework defaults;
- No personal or health data in URLs; provider-managed one-time authentication/invitation tokens must be short-lived, consumed safely and excluded from application logs;
- No phone numbers, addresses, notes or medication labels in analytics;
- Audit records are append-oriented;
- Permission changes invalidate cached access;
- Test accounts use synthetic information;
- Real communication restricted to explicit test allowlist outside production;
- Destructive account/data deletion requires confirmation and audit handling;
- Dependency audit completed without blindly applying breaking upgrades.

---

## 19. Environment configuration

Use the repository’s established naming conventions. The final system will likely require variables equivalent to:

```text
APP_MODE=local|test|production
DATA_ADAPTER=local|supabase
COMMUNICATION_ADAPTER=mock|twilio
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=             # server only
TWILIO_ACCOUNT_SID=                    # server only
TWILIO_AUTH_TOKEN=                     # server only
TWILIO_PHONE_NUMBER=
TWILIO_TEST_RECIPIENT_ALLOWLIST=
PUBLIC_APP_URL=
```

Do not assume the framework’s public-variable prefix. Inspect the existing stack and expose only variables safe for the browser.

Fail startup or disable the relevant adapter with a clear message if required configuration is missing. Never silently fall back from production Twilio to an arbitrary real recipient.

---

## 20. Definition of done

The production-shaped MVP is done when:

- The proposition is clear and UK-appropriate;
- The older-adult experience is simple and accessible;
- The complete coordinator, older-adult and responder journeys work with arbitrary user-created data;
- Sign-up, sign-in, session restoration, invitations, consent and onboarding work end to end;
- A missed routine progresses through the configured stages;
- A responder can claim ownership;
- Everyone sees who is responding;
- A responder can resolve the alert;
- Direct help bypasses normal reminder stages;
- Permissions prevent unnecessary health-detail disclosure;
- Local development and automated tests work without external accounts;
- Automated tests cover state, time, idempotency, permissions and races;
- Supabase is introduced only through repository adapters after local completion;
- Real communications are server-side, signed, allowlisted and optional;
- No screen claims Umeed proves medicine consumption or guarantees safety;
- NHS 111/999 guidance is visible but Umeed never performs clinical triage;
- README contains setup, fixture, test and deployment instructions;
- No role switcher, seeded scenario launcher, fake clock control or provider simulator appears in normal application screens;
- All quality checks pass.

---

## 21. Instructions for the implementation agent

Give the implementation agent this file, then use the following instruction:

> Read `Implementation.md` completely before modifying any code. Begin with Phase 0 only. Inspect the existing repository and map its current files, framework and screens to the plan. Build this as a real application: do not add role-switching, scenario-launcher, fake-clock or simulated-provider controls to the user interface. Use local adapters, fixtures and fake clocks only behind interfaces for development and automated testing. Do not connect Supabase, Twilio or another external service until the local release gate in Phase 8 passes. Preserve existing user work and do not perform destructive git operations. After each phase, run the available formatter, lint, type-check, unit and relevant end-to-end commands; fix failures introduced by your changes; summarise what changed; and create one focused git commit. If the repository architecture differs from the suggested structure, preserve its conventions while maintaining the domain boundaries and acceptance criteria in this document. Do not silently reduce scope or change safety rules. Ask only when a missing decision would materially alter the product.

The implementation agent must not attempt all phases in one uncontrolled change. Work phase by phase, starting with the audit, and keep the application runnable at each commit.

---

## 22. Implementation status checklist

- [x] Phase 0 — Repository audit and baseline (see `docs/phase-0-audit.md`)
- [ ] Phase 1 — Domain foundations and local adapters
- [ ] Phase 2 — Product shell, authentication and onboarding
- [ ] Phase 3 — Care circle, consent and permissions
- [ ] Phase 4 — Routines and acknowledgements
- [ ] Phase 5 — Escalation engine and alert ownership
- [ ] Phase 6 — Mock communications and direct help
- [ ] Phase 7 — Complete real-world journeys and experience polish
- [ ] Phase 8 — Test hardening and local release gate
- [ ] Phase 9 — Supabase design without cutover
- [ ] Phase 10 — Supabase cutover and server scheduling
- [ ] Phase 11 — Real communications integration
- [ ] Phase 12 — Final verification and deployment readiness
