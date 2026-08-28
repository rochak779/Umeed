import type { EscalationPolicy, EscalationStep } from "../entities/routine";

/**
 * The alert-worthy subset of an escalation policy (Implementation.md §10):
 * steps 1-2 (older_adult reminder + voice retry) never open an alert on
 * their own, so Alert.currentStage counts only the responder-facing steps
 * that follow. Stage is 1-based.
 */
export function getEscalationStepForStage(
  policy: EscalationPolicy,
  stage: number,
): EscalationStep | null {
  const responderSteps = policy.steps
    .filter((s) => s.recipientType !== "older_adult")
    .sort((a, b) => a.order - b.order);
  return responderSteps[stage - 1] ?? null;
}
