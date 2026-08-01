import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Camera, HeartHandshake, Mic, Volume2 } from "lucide-react";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { useParentLang } from "@/i18n/parent";

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

function ParentWelcome() {
  const navigate = useNavigate();
  const { data, setParentOnboarded } = useUmeed();
  const { t } = useParentLang();
  const childName = data.family.find((p) => p.role === "child")?.shortName ?? "Aditi";
  const helperName = data.family.find((p) => p.role === "helper")?.shortName ?? "Sunita";
  const cards = [
    { icon: Mic, title: t.w1Title, body: t.w1Body(childName) },
    { icon: Camera, title: t.w2Title, body: t.w2Body },
    { icon: HeartHandshake, title: t.w3Title, body: t.w3Body(helperName, childName) },
  ];
  const [i, setI] = useState(0);
  const card = cards[i]!;
  const Icon = card.icon;
  const last = i === cards.length - 1;

  return (
    <Screen className="px-5 pt-8">
      <p className="t-caption text-text-soft">{t.step(i + 1, cards.length)}</p>
      <UCard className="space-y-4 py-8 text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-sage-tint text-sage">
          <Icon size={36} aria-hidden />
        </span>
        <h1 className="t-hero text-text">{card.title}</h1>
        <p className="t-body text-text-soft">{card.body}</p>
      </UCard>

      <UButton variant="ghost" size="lg" full aria-label={t.readAloud}>
        <Volume2 size={22} aria-hidden /> {t.readAloud}
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
        {last ? t.imReady : t.next} <ArrowRight size={22} aria-hidden />
      </UButton>
      {last ? null : (
        <button
          onClick={() => {
            setParentOnboarded(true);
            navigate({ to: "/parent/home" });
          }}
          className="t-body min-h-12 w-full text-text-soft underline"
        >
          {t.skipForNow}
        </button>
      )}
    </Screen>
  );
}
