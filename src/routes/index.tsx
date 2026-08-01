import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, HeartHandshake, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/umeed/Wordmark";
import { Avatar } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umeed — someone is always close by" },
      {
        name: "description",
        content:
          "Umeed is a family care app for elder care in India. Know how your parents really are, without asking them to prove it.",
      },
      { property: "og:title", content: "Umeed — someone is always close by" },
      {
        property: "og:description",
        content:
          "One family plan covering both parents, siblings and a trusted neighbour nearby.",
      },
    ],
  }),
  component: PersonaChooser,
});

function PersonaChooser() {
  const { setPersona, setActiveParentId, resetDemo, data } = useUmeed();
  const navigate = useNavigate();

  const chooseChild = () => {
    setPersona("child");
    setActiveParentId("anuradha");
    navigate({ to: data.onboardingDone ? "/child/home" : "/child/onboarding" });
  };

  const chooseParent = () => {
    setPersona("parent");
    navigate({ to: data.parentOnboarded ? "/parent/home" : "/parent/login" });
  };

  return (
    <main className="flex flex-1 flex-col px-5 pb-6 pt-14">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-3 pb-10 text-center"
      >
        <Wordmark size="xl" />
        <p className="t-body text-text-soft">The care that feels close.</p>
      </motion.header>

      <div className="flex flex-1 flex-col justify-center gap-4">
        {[
          {
            label: "I am the family member",
            name: data.family.find((p) => p.role === "child")?.name ?? "Aditi Rao",
            icon: Users,
            tone: "trust" as const,
            onClick: chooseChild,
          },
          {
            label: "I am the parent",
            name: data.family.find((p) => p.id === "anuradha")?.name ?? "Anuradha Rao",
            icon: HeartHandshake,
            tone: "sage" as const,
            onClick: chooseParent,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.label}
              onClick={card.onClick}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.08, duration: 0.35 }}
              className="card-calm relative flex w-full items-center gap-5 overflow-hidden p-5 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-1.5",
                  card.tone === "sage" ? "bg-sage" : "bg-trust",
                )}
              />
              <span
                className={cn(
                  "flex size-16 shrink-0 items-center justify-center rounded-full",
                  card.tone === "sage" ? "bg-sage-tint text-sage-dark" : "bg-trust-tint text-trust",
                )}
              >
                <Icon aria-hidden size={30} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-section block text-text">{card.label}</span>
                <span className="t-body mt-1 block text-text-soft">{card.name}</span>
              </span>
              <ChevronRight aria-hidden size={26} className="shrink-0 text-line" />
            </motion.button>
          );
        })}
      </div>

      <div className="card-flat mt-8 space-y-3 p-4">
        <p className="t-caption flex items-start gap-3 text-text-soft">
          <HeartHandshake aria-hidden size={20} className="mt-0.5 shrink-0 text-sage" />
          One plan covers both parents, your siblings, and one trusted neighbour who can be
          there in minutes.
        </p>
        <p className="t-caption flex items-start gap-3 text-text-soft">
          <UserRound aria-hidden size={20} className="mt-0.5 shrink-0 text-sage" />
          Your parents do almost nothing. One tap, a photo, or a reading said out loud.
        </p>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            resetDemo();
            toast.success("Demo data is back to the beginning");
          }}
          className="t-caption min-h-12 rounded-full border border-line/60 px-6 text-text-soft"
        >
          Reset demo data
        </button>
      </div>
    </main>
  );
}

