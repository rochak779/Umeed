import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Check, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { dayISO } from "@/data/seed";

export const Route = createFileRoute("/parent/photo")({
  head: () => ({
    meta: [
      { title: "Take a photo — Umeed" },
      {
        name: "description",
        content: "Hold the phone over your machine or a paper. Umeed reads the numbers itself.",
      },
      { property: "og:title", content: "Take a photo — Umeed" },
      {
        property: "og:description",
        content: "You confirm every number before anything is saved.",
      },
    ],
  }),
  component: ParentPhoto,
});

function ParentPhoto() {
  const navigate = useNavigate();
  const { logVital } = useUmeed();
  const [phase, setPhase] = useState<"aim" | "reading" | "found">("aim");

  useEffect(() => {
    if (phase !== "reading") return;
    const t = setTimeout(() => setPhase("found"), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <>
      <TopBar title="Take a photo" back="/parent/home" />
      <Screen className="px-5">
        <p className="t-body text-text-soft">
          Hold the phone flat over the screen of your machine. Good light helps.
        </p>

        <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] border border-line bg-text/90">
          <div className="absolute inset-8 rounded-[0.75rem] border-2 border-white/70" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <p className="t-hero">138 / 86</p>
            <p className="t-caption opacity-80">Pulse 74</p>
          </div>
          {phase === "reading" ? (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 animate-[pulse_1.2s_ease-in-out_infinite] bg-sage"
            />
          ) : null}
        </div>

        <p className="t-body text-center text-text-soft" aria-live="polite">
          {phase === "aim"
            ? "Ready when you are."
            : phase === "reading"
              ? "Reading the numbers…"
              : "Found the numbers."}
        </p>

        {phase === "found" ? (
          <>
            <UCard className="space-y-3">
              <p className="t-caption flex items-center gap-2 text-text-soft">
                <ScanLine size={16} aria-hidden /> Read from your photo
              </p>
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
                  time: "8:12 am",
                  systolic: 138,
                  diastolic: 86,
                  pulse: 74,
                  loggedBy: "photo",
                });
                toast.success("Saved from your photo.");
                navigate({ to: "/parent/home" });
              }}
            >
              <Check size={24} aria-hidden /> Yes, that is right
            </UButton>
            <UButton variant="secondary" size="lg" full onClick={() => setPhase("aim")}>
              Take it again
            </UButton>
          </>
        ) : (
          <UButton size="xl" full onClick={() => setPhase("reading")}>
            <Camera size={24} aria-hidden /> Take the photo
          </UButton>
        )}
      </Screen>
    </>
  );
}
