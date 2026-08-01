import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Leaf,
  Share2,
  FileDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Screen, UButton, UCard, WhyPanel } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/child/brief")({
  head: () => ({
    meta: [
      { title: "Care Brief — Umeed" },
      {
        name: "description",
        content:
          "A weekly brief in plain sentences: what improved, what stayed steady, and what is worth a call.",
      },
      { property: "og:title", content: "Care Brief — Umeed" },
      {
        property: "og:description",
        content: "What changed for Mummy this week, with the numbers in the sentence.",
      },
    ],
  }),
  component: CareBrief,
});

const groups = [
  {
    key: "improved",
    title: "Improved",
    icon: CheckCircle2,
    tone: "text-sage",
    items: [
      "Took her evening calcium 6 of 7 nights, up from 3.",
      "Said a reading out loud on 5 days, up from 2 last week.",
    ],
  },
  {
    key: "steady",
    title: "Steady",
    icon: Leaf,
    tone: "text-sage",
    items: [
      "Pulse stayed between 72 and 80 all week.",
      "Weight held at 62 kg, the same as the last three weeks.",
    ],
  },
  {
    key: "watch",
    title: "Worth watching",
    icon: Eye,
    tone: "text-marigold",
    items: [
      "Blood pressure climbed from 128/82 to 146/92 across 5 mornings.",
      "The 8 am tablet was not confirmed on 2 days running.",
    ],
  },
];

function CareBrief() {
  const { data, activeParentId } = useUmeed();
  const person = data.family.find((p) => p.id === activeParentId);
  const [weekBack, setWeekBack] = useState(0);
  const empty = weekBack >= 2;

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
        <h1 className="t-card-title flex-1 font-semibold text-text">
          {person?.shortName ?? "Mummy"}'s week
        </h1>
      </header>

      <Screen>
        <div className="flex items-center justify-between gap-2">
          <UButton
            variant="ghost"
            aria-label="Previous week"
            onClick={() => setWeekBack((w) => w + 1)}
          >
            <ArrowLeft size={18} aria-hidden />
          </UButton>
          <p className="t-body font-medium text-text">
            {empty ? "Before 12 March" : weekBack === 0 ? "24 – 30 July" : "17 – 23 July"}
          </p>
          <UButton
            variant="ghost"
            aria-label="Next week"
            disabled={weekBack === 0}
            onClick={() => setWeekBack((w) => Math.max(0, w - 1))}
          >
            <ArrowRight size={18} aria-hidden />
          </UButton>
        </div>

        {empty ? (
          <UCard className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage-tint text-sage">
              <Leaf size={22} aria-hidden />
            </span>
            <p className="t-body text-text-soft">
              Umeed joined the family on 12 March. Nothing before that.
            </p>
            <UButton variant="secondary" onClick={() => setWeekBack(0)}>
              Back to this week
            </UButton>
          </UCard>
        ) : (
          <>
            <UCard>
              <p className="t-caption font-medium uppercase tracking-wide text-sage">
                In one line
              </p>
              <p className="t-section mt-2 text-text">
                A steadier week than last, with one thing worth a call.
              </p>
              <WhyPanel
                lines={[
                  "12 readings logged across the week, 5 of them in the mornings.",
                  "Evening calcium was confirmed 6 of 7 nights.",
                  "The morning blood pressure numbers moved up on 5 days in a row.",
                ]}
              />
            </UCard>

            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <section key={g.key} aria-labelledby={g.key}>
                  <h2
                    id={g.key}
                    className="t-section mb-3 flex items-center gap-2 text-text"
                  >
                    <Icon size={20} aria-hidden className={g.tone} />
                    {g.title}
                  </h2>
                  <ul className="space-y-3">
                    {g.items.map((item) => (
                      <li key={item} className="card-calm p-4">
                        <p className="t-body text-text">{item}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <UCard>
              <p className="t-card-title font-semibold text-text">How we know</p>
              <ul className="t-body mt-2 space-y-1 text-text-soft">
                <li>12 readings logged</li>
                <li>2 documents added</li>
                <li>14 reminders sent, 2 not confirmed</li>
              </ul>
            </UCard>

            <div className="flex gap-3">
              <UButton
                variant="secondary"
                full
                onClick={() => toast.success("Shared with Rohan")}
              >
                <Share2 size={18} aria-hidden /> Share with Rohan
              </UButton>
              <UButton
                variant="secondary"
                full
                onClick={() => toast.success("Saved as a PDF")}
              >
                <FileDown size={18} aria-hidden /> Save as PDF
              </UButton>
            </div>
          </>
        )}
      </Screen>
    </>
  );
}
