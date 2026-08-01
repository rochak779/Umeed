import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BellOff, Check, Eye, Footprints, Send, ShieldCheck } from "lucide-react";
import { EmptyState, Screen, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import type { AlertState } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Umeed" },
      {
        name: "description",
        content:
          "Every alert says what happened, who has been told, and where it stands right now.",
      },
      { property: "og:title", content: "Alerts — Umeed" },
      {
        property: "og:description",
        content: "Calm wording, clear next step, and no panic.",
      },
    ],
  }),
  component: Alerts,
});

const stateMeta: Record<AlertState, { word: string; icon: typeof Send; cx: string }> = {
  sent: { word: "Sent", icon: Send, cx: "text-trust bg-trust/10 border-trust/30" },
  seen: { word: "Seen", icon: Eye, cx: "text-marigold bg-marigold/10 border-marigold/40" },
  "on-the-way": {
    word: "On the way",
    icon: Footprints,
    cx: "text-sage bg-sage-tint border-sage/30",
  },
  resolved: { word: "Resolved", icon: Check, cx: "text-sage bg-sage-tint border-sage/30" },
};

function Alerts() {
  const { data, acknowledgeAlert } = useUmeed();

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <Link
          to="/child/home"
          aria-label="Go back"
          className="flex size-12 items-center justify-center rounded-full text-text"
        >
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <h1 className="t-card-title flex-1 font-semibold text-text">Alerts</h1>
      </header>

      <Screen>
        <div aria-live="polite" className="space-y-3">
          {data.alerts.length === 0 ? (
            <EmptyState
              icon={BellOff}
              line="No alerts. That is exactly what we want."
              action={
                <Link
                  to="/child/home"
                  className="t-caption min-h-12 px-4 py-3 text-trust underline"
                >
                  Back to today
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((a) => {
                const person = data.family.find((p) => p.id === a.parentId);
                const meta = stateMeta[a.state];
                const Icon = meta.icon;
                return (
                  <UCard as="li" key={a.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="t-caption text-text-soft">
                          {person?.shortName} · {a.time}
                        </p>
                        <p className="t-card-title mt-1 font-medium text-text">{a.headline}</p>
                        <p className="t-body mt-1 text-text-soft">{a.body}</p>
                      </div>
                      <span
                        className={cn(
                          "t-caption inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 transition-colors duration-300",
                          meta.cx,
                        )}
                      >
                        <Icon size={13} aria-hidden />
                        {meta.word}
                      </span>
                    </div>
                    <p className="t-caption flex items-center gap-1.5 text-text-soft">
                      <ShieldCheck size={14} aria-hidden />
                      Told: {a.told.join(", ")}
                    </p>
                    {a.acknowledged ? (
                      <p className="t-caption flex items-center gap-1.5 text-sage">
                        <Check size={14} aria-hidden /> You have seen this
                      </p>
                    ) : (
                      <UButton variant="secondary" full onClick={() => acknowledgeAlert(a.id)}>
                        <Check size={18} aria-hidden /> I have seen this
                      </UButton>
                    )}
                  </UCard>
                );
              })}
            </ul>
          )}
        </div>
      </Screen>
    </>
  );
}
