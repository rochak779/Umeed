import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Mic, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { dayISO } from "@/data/seed";

export const Route = createFileRoute("/parent/speak")({
  head: () => ({
    meta: [
      { title: "Say your reading — Umeed" },
      {
        name: "description",
        content:
          "Speak your blood pressure the way you would say it to family. Umeed writes it down.",
      },
      { property: "og:title", content: "Say your reading — Umeed" },
      {
        property: "og:description",
        content: "You always see what Umeed heard before it is saved.",
      },
    ],
  }),
  component: ParentSpeak,
});

const HEARD = "One thirty eight over eighty six, pulse seventy four";

function ParentSpeak() {
  const navigate = useNavigate();
  const { logVital } = useUmeed();
  const [phase, setPhase] = useState<"idle" | "listening" | "heard">("idle");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (phase !== "listening") return;
    const t = setTimeout(() => setPhase("heard"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "heard") return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(HEARD.slice(0, i));
      if (i >= HEARD.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <>
      <TopBar title="Say your reading" back="/parent/home" />
      <Screen className="px-5">
        <p className="t-body text-text-soft">
          Tap the button and say it simply: “one thirty eight over eighty six”.
        </p>

        <UCard className="flex flex-col items-center gap-5 py-9">
          <button
            onClick={() => setPhase("listening")}
            aria-label="Start listening"
            className="relative flex size-32 items-center justify-center rounded-full bg-sage text-white"
          >
            {phase === "listening" ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-sage/40" aria-hidden />
            ) : null}
            <Mic size={46} aria-hidden />
          </button>
          <p className="t-body text-center text-text-soft" aria-live="polite">
            {phase === "idle"
              ? "Ready when you are."
              : phase === "listening"
                ? "Listening…"
                : "This is what I heard."}
          </p>
          {phase === "heard" ? (
            <p className="t-card-title px-2 text-center font-medium text-text">“{typed}”</p>
          ) : null}
        </UCard>

        {phase === "heard" ? (
          <>
            <UCard className="space-y-3">
              <p className="t-caption text-text-soft">Umeed will save</p>
              <p className="t-hero text-text">138 / 86</p>
              <p className="t-body text-text-soft">Pulse 74 beats a minute · this morning</p>
            </UCard>
            <UButton
              size="xl"
              full
              onClick={() => {
                logVital({
                  parentId: "anuradha",
                  date: dayISO(0),
                  time: "8:10 am",
                  systolic: 138,
                  diastolic: 86,
                  pulse: 74,
                  loggedBy: "voice",
                });
                toast.success("Saved. Aditi can see it now.");
                navigate({ to: "/parent/home" });
              }}
            >
              <Check size={24} aria-hidden /> Yes, that is right
            </UButton>
            <UButton variant="secondary" size="lg" full onClick={() => setPhase("idle")}>
              Let me say it again
            </UButton>
          </>
        ) : (
          <UButton variant="ghost" size="lg" full aria-label="Read this out loud">
            <Volume2 size={22} aria-hidden /> Read this out loud
          </UButton>
        )}
      </Screen>
    </>
  );
}
