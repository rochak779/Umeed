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
    <main className="flex flex-1 flex-col px-6 pb-8 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Wordmark size="xl" />
        <p className="t-section mt-2 max-w-[18rem] font-normal text-text">
          Someone is always close by.
        </p>
        <p className="t-body mt-3 max-w-[19rem] text-text-soft">
          Know how your parents really are, without asking them to prove it.
        </p>
      </motion.div>

      <div className="mt-10 space-y-4">
        <motion.button
          onClick={chooseChild}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="card-calm flex w-full items-center gap-4 p-4 text-left"
        >
          <Avatar initials="FM" size={56} />
          <span className="min-w-0 flex-1">
            <span className="t-card-title block font-semibold text-text">
              I am the family member
            </span>
            <span className="t-caption block text-text-soft">
              {"\n"}
            </span>
          </span>
          <ChevronRight aria-hidden size={22} className="text-sage" />
        </motion.button>

        <motion.button
          onClick={chooseParent}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35 }}
          className="card-calm flex w-full items-center gap-4 p-4 text-left"
        >
          <Avatar initials="PA" size={56} tone="marigold" />
          <span className="min-w-0 flex-1">
            <span className="t-card-title block font-semibold text-text">I am the parent</span>
            <span className="t-caption block text-text-soft">
              {"\n"}
            </span>
          </span>
          <ChevronRight aria-hidden size={22} className="text-sage" />
        </motion.button>
      </div>

      <div className="mt-8 space-y-4 rounded-[1rem] border border-line bg-sage-tint/60 p-4">
        <p className="t-body flex items-start gap-3 text-text">
          <HeartHandshake aria-hidden size={20} className="mt-0.5 shrink-0 text-sage" />
          One plan covers both parents, your siblings, and one trusted neighbour who can be
          there in minutes.
        </p>
        <p className="t-body flex items-start gap-3 text-text">
          <UserRound aria-hidden size={20} className="mt-0.5 shrink-0 text-sage" />
          Your parents do almost nothing. One tap, a photo, or a reading said out loud.
        </p>
      </div>

      <div className="mt-auto pt-8 text-center">
        <button
          onClick={() => {
            resetDemo();
            toast.success("Demo data is back to the beginning");
          }}
          className="t-caption min-h-12 px-4 text-trust underline"
        >
          Reset demo data
        </button>
      </div>
    </main>
  );
}
