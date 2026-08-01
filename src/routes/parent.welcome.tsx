import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Camera, HeartHandshake, Mic, Volume2 } from "lucide-react";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/parent/welcome")({
  head: () => ({
    meta: [
      { title: "Three things to know — Umeed" },
      {
        name: "description",
        content:
          "A short spoken tour: say your reading, send a photo, or ask for help. Nothing else.",
      },
      { property: "og:title", content: "Three things to know — Umeed" },
      {
        property: "og:description",
        content: "Umeed reads every screen out loud if you would rather listen.",
      },
    ],
  }),
  component: ParentWelcome,
});

const CARDS = [
  {
    icon: Mic,
    title: "Say your reading",
    body: "Tap the green button and say it the way you would tell Aditi. Nothing to type.",
  },
  {
    icon: Camera,
    title: "Or send a photo",
    body: "Hold the phone over your machine or a paper. Umeed reads the numbers itself.",
  },
  {
    icon: HeartHandshake,
    title: "Ask for help",
    body: "The orange button tells Sunita next door and Aditi at the same moment.",
  },
];

function ParentWelcome() {
  const navigate = useNavigate();
  const { setParentOnboarded } = useUmeed();
  const [i, setI] = useState(0);
  const card = CARDS[i]!;
  const Icon = card.icon;
  const last = i === CARDS.length - 1;

  return (
    <Screen className="px-5 pt-8">
      <p className="t-caption text-text-soft">
        Step {i + 1} of {CARDS.length}
      </p>
      <UCard className="space-y-4 py-8 text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-sage-tint text-sage">
          <Icon size={36} aria-hidden />
        </span>
        <h1 className="t-hero text-text">{card.title}</h1>
        <p className="t-body text-text-soft">{card.body}</p>
      </UCard>

      <UButton variant="ghost" size="lg" full aria-label="Read this out loud">
        <Volume2 size={22} aria-hidden /> Read this out loud
      </UButton>

      <UButton
        size="xl"
        full
        onClick={() => {
          if (last) {
            setParentOnboarded(true);
            navigate({ to: "/parent/home" });
          } else {
            setI(i + 1);
          }
        }}
      >
        {last ? "I am ready" : "Next"} <ArrowRight size={22} aria-hidden />
      </UButton>
      {last ? null : (
        <button
          onClick={() => {
            setParentOnboarded(true);
            navigate({ to: "/parent/home" });
          }}
          className="t-body min-h-12 w-full text-text-soft underline"
        >
          Skip for now
        </button>
      )}
    </Screen>
  );
}
