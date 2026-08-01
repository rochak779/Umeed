import type { Alert, UmeedData } from "@/data/seed";

export const LADDER_STEPS = [
  {
    key: "reminded",
    title: "Parent reminded",
    detail: "A gentle nudge on their phone at the usual time.",
  },
  {
    key: "reminded-again",
    title: "Reminded again",
    detail: "Thirty minutes later, and a quiet note appears for you.",
  },
  {
    key: "neighbour",
    title: "Neighbour asked",
    detail: "Sunita, 200 metres away, is asked to look in.",
  },
  {
    key: "family",
    title: "Family alerted",
    detail: "If nobody has looked in within 30 minutes, you hear from us directly.",
  },
] as const;

export type LadderKey = (typeof LADDER_STEPS)[number]["key"];

export function ladderIndexForMiss(missStreak: number): number {
  if (missStreak >= 3) return 2;
  if (missStreak === 2) return 1;
  if (missStreak === 1) return 0;
  return -1;
}

let counter = 0;
const nextId = () => `al-${Date.now()}-${counter++}`;

export function buildMissAlert(
  data: UmeedData,
  parentId: string,
  reminderLabel: string,
  missStreak: number,
  time: string,
): Alert | null {
  const person = data.family.find((p) => p.id === parentId);
  const who = person?.shortName ?? "Your parent";
  if (missStreak === 1) {
    return {
      id: nextId(),
      parentId,
      headline: `${who} has not confirmed ${reminderLabel} yet`,
      body: "We have sent a gentle second reminder. Nothing to do for now.",
      time,
      told: [who],
      state: "sent",
      level: 1,
      acknowledged: false,
    };
  }
  if (missStreak === 2) {
    return {
      id: nextId(),
      parentId,
      headline: `${who} missed ${reminderLabel} twice in a row`,
      body: "We reminded her again and added a note to what changed this week.",
      time,
      told: [who, "Aditi"],
      state: "sent",
      level: 2,
      acknowledged: false,
    };
  }
  if (missStreak >= 3) {
    return {
      id: nextId(),
      parentId,
      headline: `${who} has not confirmed ${reminderLabel} three days running`,
      body: `We have asked Sunita to look in on ${who}.`,
      time,
      told: [who, "Sunita", "Aditi"],
      state: "sent",
      level: 3,
      acknowledged: false,
    };
  }
  return null;
}

export function buildSosAlert(data: UmeedData, parentId: string, time: string): Alert {
  const person = data.family.find((p) => p.id === parentId);
  const who = person?.shortName ?? "Your parent";
  return {
    id: nextId(),
    parentId,
    headline: `${who} asked for help`,
    body: "Sunita and Aditi were told at the same moment. Sunita is 200 metres away.",
    time,
    told: ["Sunita", "Aditi", "Rohan"],
    state: "sent",
    level: "sos",
    acknowledged: false,
  };
}

export function buildHelperTimeoutAlert(
  data: UmeedData,
  parentId: string,
  time: string,
): Alert {
  const person = data.family.find((p) => p.id === parentId);
  const who = person?.shortName ?? "Your parent";
  return {
    id: nextId(),
    parentId,
    headline: `Nobody has looked in on ${who} yet`,
    body: "Sunita has not been able to reply in the last thirty minutes. It is worth calling now.",
    time,
    told: ["Aditi", "Rohan"],
    state: "sent",
    level: 4,
    acknowledged: false,
  };
}

/** 30 minutes in real life, 5 seconds when a presenter is walking through. */
export function waitMs(demoSpeed: "demo" | "real") {
  return demoSpeed === "demo" ? 5000 : 30 * 60 * 1000;
}
