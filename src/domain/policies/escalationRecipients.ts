import type { CircleMember } from "../entities/careCircle.ts";
import type { EscalationStep } from "../entities/routine.ts";

function isWithinAvailability(member: CircleMember, nowUtc: string, timezone: string): boolean {
  if (!member.availability) return true;

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(nowUtc)).map((p) => [p.type, p.value]),
  );
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    String(parts["weekday"]),
  );
  const localTime = `${parts["hour"]}:${parts["minute"]}`;

  if (!member.availability.daysOfWeek.includes(weekdayIndex)) return false;
  return (
    localTime >= member.availability.startLocalTime && localTime <= member.availability.endLocalTime
  );
}

/**
 * Selects who an escalation step should notify, in priority order
 * (Implementation.md §10, §17.1 "recipient ordering" / "availability
 * filtering"). A member with no declared availability is always available.
 */
export function selectNextRecipients(
  members: CircleMember[],
  step: EscalationStep,
  nowUtc: string,
  timezone: string,
): CircleMember[] {
  return members
    .filter((m) => m.responderType === step.recipientType)
    .filter((m) => (step.recipientType === "nearby_responder" ? m.isNearby : true))
    .filter((m) => isWithinAvailability(m, nowUtc, timezone))
    .sort((a, b) => a.priority - b.priority);
}
