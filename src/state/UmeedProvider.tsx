import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  seed,
  type Alert,
  type AlertState,
  type Doc,
  type PersonaKind,
  type Reminder,
  type StatusKind,
  type TimelineEvent,
  type UmeedData,
  type Vital,
  dayISO,
} from "@/data/seed";
import { buildHelperTimeoutAlert, buildMissAlert, buildSosAlert, waitMs } from "./escalation";

const KEY = "umeed.v1";

export type PushMessage = { id: string; title: string; body: string };

type Ctx = {
  persona: PersonaKind | null;
  setPersona: (p: PersonaKind | null) => void;
  activeParentId: string;
  setActiveParentId: (id: string) => void;
  data: UmeedData;
  sosActive: boolean;
  demoSpeed: "demo" | "real";
  setDemoSpeed: (s: "demo" | "real") => void;
  push: PushMessage | null;
  sendPush: (title: string, body: string) => void;
  dismissPush: () => void;
  logVital: (v: Omit<Vital, "id">) => void;
  addDocument: (d: Omit<Doc, "id">) => void;
  addReminder: (r: Omit<Reminder, "id" | "days" | "missStreak">) => void;
  completeReminder: (id: string) => void;
  missReminder: (id: string) => void;
  triggerSOS: (parentId: string) => void;
  cancelSOS: () => void;
  acknowledgeAlert: (id: string) => void;
  setAlertState: (id: string, state: AlertState) => void;
  helperRespond: (going: boolean) => void;
  advanceClock: (days: number) => void;
  updatePerson: (id: string, patch: Partial<UmeedData["family"][number]>) => void;
  setStatus: (parentId: string, status: StatusKind) => void;
  setOnboardingDone: (v: boolean) => void;
  setParentOnboarded: (v: boolean) => void;
  resetDemo: () => void;
};

const UmeedContext = createContext<Ctx | null>(null);

function load(): { data: UmeedData; persona: PersonaKind | null } {
  if (typeof window === "undefined") return { data: seed, persona: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { data: seed, persona: null };
    const parsed = JSON.parse(raw);
    return {
      data: { ...seed, ...parsed.data },
      persona: parsed.persona ?? null,
    };
  } catch {
    return { data: seed, persona: null };
  }
}

const nowTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();

export function UmeedProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UmeedData>(seed);
  const [persona, setPersonaState] = useState<PersonaKind | null>(null);
  const [activeParentId, setActiveParentId] = useState("anuradha");
  const [demoSpeed, setDemoSpeed] = useState<"demo" | "real">("demo");
  const [push, setPush] = useState<PushMessage | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const loaded = load();
    setData(loaded.data);
    setPersonaState(loaded.persona);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify({ data, persona }));
  }, [data, persona, hydrated]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  const sosActive = data.alerts.some((a) => a.level === "sos" && a.state !== "resolved");

  const setPersona = useCallback((p: PersonaKind | null) => setPersonaState(p), []);

  const sendPush = useCallback((title: string, body: string) => {
    setPush({ id: `${Date.now()}`, title, body });
  }, []);
  const dismissPush = useCallback(() => setPush(null), []);

  const addTimeline = (d: UmeedData, ev: Omit<TimelineEvent, "id">): UmeedData => ({
    ...d,
    timeline: [{ ...ev, id: `tl-${Date.now()}-${Math.random()}` }, ...d.timeline],
  });

  const logVital = useCallback((v: Omit<Vital, "id">) => {
    setData((d) =>
      addTimeline(
        { ...d, vitals: [...d.vitals, { ...v, id: `v-${Date.now()}` }] },
        {
          parentId: v.parentId,
          kind: "vital",
          title:
            v.loggedBy === "voice"
              ? "Reading said out loud by Mummy"
              : "Reading added from a photo",
          detail:
            v.systolic && v.diastolic
              ? `Blood pressure ${v.systolic} over ${v.diastolic}`
              : v.sugar
                ? `Sugar ${v.sugar} mg/dL`
                : undefined,
          date: dayISO(0),
          time: v.time,
        },
      ),
    );
  }, []);

  const addDocument = useCallback((doc: Omit<Doc, "id">) => {
    setData((d) =>
      addTimeline(
        { ...d, documents: [{ ...doc, id: `doc-${Date.now()}` }, ...d.documents] },
        {
          parentId: doc.parentId,
          kind: "document",
          title: `${doc.type} filed by Umeed`,
          detail: doc.title,
          date: dayISO(0),
          time: nowTime(),
        },
      ),
    );
  }, []);

  const addReminder = useCallback((r: Omit<Reminder, "id" | "days" | "missStreak">) => {
    setData((d) => ({
      ...d,
      reminders: [
        ...d.reminders,
        {
          ...r,
          id: `r-${Date.now()}`,
          missStreak: 0,
          days: Array(7).fill("upcoming") as Reminder["days"],
        },
      ],
    }));
  }, []);

  const completeReminder = useCallback((id: string) => {
    setData((d) => {
      const rem = d.reminders.find((r) => r.id === id);
      if (!rem) return d;
      const days = [...rem.days];
      days[6] = "done";
      return addTimeline(
        {
          ...d,
          reminders: d.reminders.map((r) =>
            r.id === id ? { ...r, days, missStreak: 0 } : r,
          ),
        },
        {
          parentId: rem.parentId,
          kind: "reminder",
          title: `${rem.label} taken`,
          date: dayISO(0),
          time: nowTime(),
        },
      );
    });
  }, []);

  const setAlertState = useCallback((id: string, state: AlertState) => {
    setData((d) => ({
      ...d,
      alerts: d.alerts.map((a) => (a.id === id ? { ...a, state } : a)),
    }));
  }, []);

  const missReminder = useCallback(
    (id: string) => {
      let created: Alert | null = null;
      setData((d) => {
        const rem = d.reminders.find((r) => r.id === id);
        if (!rem) return d;
        const streak = rem.missStreak + 1;
        const days = [...rem.days];
        days[6] = "missed";
        const alert = buildMissAlert(d, rem.parentId, rem.label, streak, `Today, ${nowTime()}`);
        created = alert;
        let next: UmeedData = {
          ...d,
          reminders: d.reminders.map((r) =>
            r.id === id ? { ...r, days, missStreak: streak } : r,
          ),
          alerts: alert ? [alert, ...d.alerts] : d.alerts,
          statuses: {
            ...d.statuses,
            [rem.parentId]: streak >= 3 ? "attention" : streak >= 1 ? "watch" : "steady",
          },
        };
        next = addTimeline(next, {
          parentId: rem.parentId,
          kind: streak >= 3 ? "alert" : "reminder",
          title:
            streak >= 3
              ? "Sunita was asked to look in"
              : `${rem.label} not confirmed`,
          detail: streak >= 3 ? "Third day running" : `Miss ${streak} of 3`,
          date: dayISO(0),
          time: nowTime(),
        });
        return next;
      });
      if (created) {
        const alert = created as Alert;
        if (alert.level === 1)
          sendPush("A gentle second reminder went out", "We will keep an eye on it for you.");
        if (alert.level === 2)
          sendPush(
            "We have noticed a few changes this week",
            "It may be a good time to check in with Mummy.",
          );
        if (alert.level === 3) {
          sendPush(
            "Sunita has been asked to look in",
            "Mummy has not confirmed her morning tablet three days running.",
          );
          later(() => {
            setData((d) => {
              const still = d.alerts.find((a) => a.id === alert.id);
              if (!still || still.state !== "sent") return d;
              return {
                ...d,
                alerts: [
                  buildHelperTimeoutAlert(d, alert.parentId, `Today, ${nowTime()}`),
                  ...d.alerts,
                ],
              };
            });
          }, waitMs(demoSpeed) * 6);
        }
      }
    },
    [demoSpeed, later, sendPush],
  );

  const triggerSOS = useCallback(
    (parentId: string) => {
      let id = "";
      setData((d) => {
        const alert = buildSosAlert(d, parentId, `Today, ${nowTime()}`);
        id = alert.id;
        return addTimeline(
          { ...d, alerts: [alert, ...d.alerts] },
          {
            parentId,
            kind: "alert",
            title: "Help was asked for",
            detail: "Sunita and Aditi told at the same moment",
            date: dayISO(0),
            time: nowTime(),
          },
        );
      });
      sendPush("Sunita has been told", "She is 200 metres away and is heading over.");
      later(() => setAlertState(id, "seen"), 2500);
      later(() => setAlertState(id, "on-the-way"), 6000);
    },
    [later, sendPush, setAlertState],
  );

  const cancelSOS = useCallback(() => {
    setData((d) => ({
      ...d,
      alerts: d.alerts.map((a) => (a.level === "sos" ? { ...a, state: "resolved" } : a)),
    }));
    sendPush("Everyone has been told she is okay", "Sunita and Rohan know the moment passed.");
  }, [sendPush]);

  const acknowledgeAlert = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      alerts: d.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    }));
  }, []);

  const helperRespond = useCallback(
    (going: boolean) => {
      setData((d) => {
        const open = d.alerts.filter((a) => a.state !== "resolved");
        const target = open[0];
        return addTimeline(
          {
            ...d,
            alerts: d.alerts.map((a) =>
              target && a.id === target.id
                ? {
                    ...a,
                    state: going ? "on-the-way" : "seen",
                    told: Array.from(new Set([...a.told, "Sunita"])),
                    body: going
                      ? "Sunita is on her way. She will update in a few minutes."
                      : "Sunita cannot go right now. It is worth calling Mummy yourself.",
                  }
                : a,
            ),
          },
          {
            parentId: target?.parentId ?? "anuradha",
            kind: "helper",
            title: going ? "Sunita is on her way" : "Sunita cannot go right now",
            date: dayISO(0),
            time: nowTime(),
          },
        );
      });
      sendPush(
        going ? "Sunita is on her way to Mummy's" : "Sunita cannot go right now",
        going
          ? "She will update in a few minutes."
          : "You may want to call Mummy yourself.",
      );
    },
    [sendPush],
  );

  const advanceClock = useCallback((days: number) => {
    setData((d) => ({ ...d, clockOffsetDays: d.clockOffsetDays + days }));
  }, []);

  const setStatus = useCallback((parentId: string, status: StatusKind) => {
    setData((d) => ({ ...d, statuses: { ...d.statuses, [parentId]: status } }));
  }, []);

  const setOnboardingDone = useCallback(
    (v: boolean) => setData((d) => ({ ...d, onboardingDone: v })),
    [],
  );
  const setParentOnboarded = useCallback(
    (v: boolean) => setData((d) => ({ ...d, parentOnboarded: v })),
    [],
  );

  const resetDemo = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setData(seed);
    setPersonaState(null);
    setActiveParentId("anuradha");
    setPush(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      persona,
      setPersona,
      activeParentId,
      setActiveParentId,
      data,
      sosActive,
      demoSpeed,
      setDemoSpeed,
      push,
      sendPush,
      dismissPush,
      logVital,
      addDocument,
      addReminder,
      completeReminder,
      missReminder,
      triggerSOS,
      cancelSOS,
      acknowledgeAlert,
      setAlertState,
      helperRespond,
      advanceClock,
      setStatus,
      setOnboardingDone,
      setParentOnboarded,
      resetDemo,
    }),
    [
      persona,
      setPersona,
      activeParentId,
      data,
      sosActive,
      demoSpeed,
      push,
      sendPush,
      dismissPush,
      logVital,
      addDocument,
      addReminder,
      completeReminder,
      missReminder,
      triggerSOS,
      cancelSOS,
      acknowledgeAlert,
      setAlertState,
      helperRespond,
      advanceClock,
      setStatus,
      setOnboardingDone,
      setParentOnboarded,
      resetDemo,
    ],
  );

  return <UmeedContext.Provider value={value}>{children}</UmeedContext.Provider>;
}

export function useUmeed() {
  const ctx = useContext(UmeedContext);
  if (!ctx) throw new Error("useUmeed must be used inside UmeedProvider");
  return ctx;
}

export function usePerson(id: string) {
  const { data } = useUmeed();
  return data.family.find((p) => p.id === id);
}
