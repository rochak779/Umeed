import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlarmClock,
  FastForward,
  HeartHandshake,
  RotateCcw,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { EscalationLadder } from "@/components/umeed/EscalationLadder";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Presenter controls — Umeed" },
      {
        name: "description",
        content:
          "Drive the escalation ladder, jump personas and reset the story mid-demo, without leaving the phone.",
      },
      { property: "og:title", content: "Presenter controls — Umeed" },
      {
        property: "og:description",
        content: "Every step of the ladder on one screen.",
      },
    ],
  }),
  component: DemoPanel,
});

function DemoPanel() {
  const { data, missReminder, triggerSOS, resetDemo, advanceClock, demoSpeed, setDemoSpeed } =
    useUmeed();
  const morning = data.reminders.find((r) => r.parentId === "anuradha" && r.kind === "medicine");
  const streak = morning?.missStreak ?? 0;

  return (
    <>
      <TopBar title="Presenter controls" subtitle="Only you can see this" back="/" />
      <Screen>
        <UCard className="space-y-3">
          <p className="t-section text-text">Escalation right now</p>
          <EscalationLadder activeIndex={streak - 1} showSos={false} />
        </UCard>

        <UCard className="space-y-3">
          <p className="t-section text-text">Miss the 8:00 am tablet</p>
          <p className="t-body text-text-soft">
            Each press moves one rung: gentle nudge, then family, then Sunita.
          </p>
          <UButton
            size="lg"
            full
            onClick={() => {
              if (!morning) return;
              missReminder(morning.id);
              toast.success(`Miss ${Math.min(streak + 1, 3)} recorded`);
            }}
          >
            <AlarmClock size={20} aria-hidden /> Record a miss
          </UButton>
          <UButton variant="danger" size="lg" full onClick={() => triggerSOS("anuradha")}>
            <HeartHandshake size={20} aria-hidden /> Fire an SOS
          </UButton>
        </UCard>

        <UCard className="space-y-3">
          <p className="t-section text-text">Pacing</p>
          <div className="flex gap-2">
            {(["demo", "real"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setDemoSpeed(s)}
                aria-pressed={demoSpeed === s}
                className={`t-caption min-h-12 flex-1 rounded-full border px-3 ${
                  demoSpeed === s
                    ? "border-sage bg-sage-tint text-sage"
                    : "border-line bg-surface text-text-soft"
                }`}
              >
                {s === "demo" ? "Fast, for demo" : "Real timings"}
              </button>
            ))}
          </div>
          <UButton variant="secondary" size="lg" full onClick={() => advanceClock(1)}>
            <FastForward size={20} aria-hidden /> Jump one day ahead
          </UButton>
        </UCard>

        <UCard className="space-y-3">
          <p className="t-section text-text">Jump to a view</p>
          {[
            { to: "/child/home", label: "Aditi, the daughter", icon: UserRound },
            { to: "/parent/home", label: "Anuradha ji, the parent", icon: UserRound },
            { to: "/helper", label: "Sunita, the neighbour", icon: Users },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="block">
              <UButton variant="secondary" size="lg" full>
                <l.icon size={20} aria-hidden /> {l.label}
              </UButton>
            </Link>
          ))}
        </UCard>

        <UButton
          variant="ghost"
          size="lg"
          full
          onClick={() => {
            resetDemo();
            toast.success("Back to the start of the story");
          }}
        >
          <RotateCcw size={20} aria-hidden /> Reset the whole demo
        </UButton>
      </Screen>
    </>
  );
}
