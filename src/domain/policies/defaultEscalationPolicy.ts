import type { EscalationStep } from "../entities/routine.ts";

/**
 * The production default every new routine starts with (Implementation.md
 * §10): in-app reminder, voice retry after 10 min, first nearby responder
 * after another 10 min, then the coordinator after 5 min — and if still
 * unclaimed, everyone remaining.
 */
export const DEFAULT_ESCALATION_STEPS: readonly EscalationStep[] = [
  {
    order: 1,
    delayMinutes: 0,
    recipientType: "older_adult",
    recipientId: null,
    channel: "in_app",
    responseWindowMinutes: 10,
    fallbackBehaviour: "advance_to_next_step",
  },
  {
    order: 2,
    delayMinutes: 10,
    recipientType: "older_adult",
    recipientId: null,
    channel: "voice",
    responseWindowMinutes: 10,
    fallbackBehaviour: "advance_to_next_step",
  },
  {
    order: 3,
    delayMinutes: 10,
    recipientType: "nearby_responder",
    recipientId: null,
    channel: "push",
    responseWindowMinutes: 5,
    fallbackBehaviour: "advance_to_next_step",
  },
  {
    order: 4,
    delayMinutes: 5,
    recipientType: "coordinator",
    recipientId: null,
    channel: "push",
    responseWindowMinutes: 5,
    fallbackBehaviour: "notify_all_remaining",
  },
];
