import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Check, Clock, HeartHandshake, Mic, Pill, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { Wordmark } from "@/components/umeed/Wordmark";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/parent/home")({
  head: () => ({
    meta: [
      { title: "Today — Umeed for parents" },
      {
        name: "description",
        content: "One task at a time, in large type: your tablet, your reading, and help.",
      },
      { property: "og:title", content: "Today — Umeed for parents" },
      {
        property: "og:description",
        content: "No feeds, no badges. Just what to do next.",
      },
    ],
  }),
  component: ParentHome,
});

function ParentHome() {
  const { data, completeReminder } = useUmeed();
  const parent = data.family.find((p) => p.id === "anuradha");
  const child = data.family.find((p) => p.role === "child");
  const next = data.reminders
    .filter((r) => r.parentId === "anuradha" && r.kind === "medicine")
    .find((r) => r.days[6] !== "done");

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-7">
        <Wordmark />
        <Link
          to="/parent/help"
          aria-label="Family"
          className="flex size-14 items-center justify-center rounded-full bg-container-high text-text"
        >
          <Users size={26} aria-hidden />
        </Link>
      </header>

      <Screen className="flex flex-1 flex-col px-5">
        <section>
          <h1 className="t-display text-text">नमस्ते, {parent?.shortName ?? "Anuradha"} ji</h1>
          <p className="t-section font-normal text-text-soft">Thursday, 30 July</p>
        </section>

        {/* One task at a time */}
        <UCard className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-marigold-tint text-marigold">
              <Pill size={32} aria-hidden />
            </span>
            <h2 className="t-section text-text">
              {next ? `Time for your ${next.time} tablet` : "Nothing left to take today"}
            </h2>
          </div>

          <div className="rounded-[1rem] bg-container p-4 text-center">
            <p className="t-section font-bold text-text">
              {next ? next.label : "All done. Rest well."}
            </p>
          </div>

          {next ? (
            <div className="space-y-3">
              <UButton
                size="xl"
                full
                className="min-h-20 t-section"
                onClick={() => {
                  completeReminder(next.id);
                  toast.success("Noted. Aditi can see it.");
                }}
              >
                <Check size={30} aria-hidden /> Taken
              </UButton>
              <UButton
                variant="secondary"
                size="xl"
                full
                className="min-h-20 t-section"
                onClick={() => toast("We will ask you again in a little while.")}
              >
                <Clock size={30} aria-hidden /> Not yet
              </UButton>
            </div>
          ) : (
            <UButton variant="ghost" size="lg" full aria-label="Read this out loud">
              <Volume2 size={24} aria-hidden /> Read this out loud
            </UButton>
          )}
        </UCard>

        {/* Three big tiles */}
        <section className="grid grid-cols-3 gap-3 pb-4">
          <Link
            to="/parent/speak"
            className="card-calm flex min-h-[8rem] flex-col items-center justify-center gap-2 p-3"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-trust-tint text-trust">
              <Mic size={30} aria-hidden />
            </span>
            <span className="t-caption font-medium text-text">Speak</span>
          </Link>
          <Link
            to="/parent/photo"
            className="card-calm flex min-h-[8rem] flex-col items-center justify-center gap-2 p-3"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-marigold-tint text-marigold">
              <Camera size={30} aria-hidden />
            </span>
            <span className="t-caption font-medium text-text">Photo</span>
          </Link>
          <Link
            to="/parent/help"
            className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-critical/20 bg-critical-tint p-3 shadow-calm"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-critical text-white">
              <HeartHandshake size={30} aria-hidden />
            </span>
            <span className="t-caption font-bold text-critical">Help</span>
          </Link>
        </section>

        <p className="t-caption pb-2 text-center text-text-soft">
          {child?.shortName ?? "Aditi"} can see everything you do here.
        </p>
      </Screen>
    </>
  );
}


