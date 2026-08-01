import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, HeartHandshake, Mic, Pill, Volume2 } from "lucide-react";
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
      <div className="flex items-center justify-between px-5 pt-7">
        <Wordmark />
        <span className="t-caption text-text-soft">Thursday, 30 July</span>
      </div>

      <Screen className="px-5">
        <h1 className="t-hero text-text">Namaste, {parent?.shortName ?? "Anuradha"} ji</h1>

        {/* One task at a time */}
        <UCard className="space-y-5 py-6">
          <span className="flex size-20 items-center justify-center rounded-full bg-sage-tint text-sage">
            <Pill size={38} aria-hidden />
          </span>
          <div>
            <p className="t-body text-text-soft">
              {next ? `Due at ${next.time}` : "All done for today"}
            </p>
            <p className="t-title font-semibold text-text">
              {next ? next.label : "Nothing left to take"}
            </p>
          </div>
          {next ? (
            <UButton
              size="xl"
              full
              className="min-h-20 t-title"
              onClick={() => {
                completeReminder(next.id);
                toast.success("Noted. Aditi can see it.");
              }}
            >
              <Check size={30} aria-hidden /> I have taken it
            </UButton>
          ) : (
            <p className="t-body text-sage">Everything for today is done. Rest well.</p>
          )}
          <UButton variant="ghost" size="lg" full aria-label="Read this out loud">
            <Volume2 size={24} aria-hidden /> Read this out loud
          </UButton>
        </UCard>

        {/* Two big choices */}
        <Link to="/parent/speak" className="block">
          <UButton variant="secondary" size="xl" full className="min-h-20 t-title">
            <Mic size={30} aria-hidden /> Say my reading
          </UButton>
        </Link>

        <Link to="/parent/help" className="block">
          <UButton variant="danger" size="xl" full className="min-h-20 t-title">
            <HeartHandshake size={30} aria-hidden /> I need help now
          </UButton>
        </Link>

        <p className="t-caption pb-4 text-center text-text-soft">
          {child?.shortName ?? "Aditi"} can see everything you do here.
        </p>
      </Screen>
    </>
  );
}

