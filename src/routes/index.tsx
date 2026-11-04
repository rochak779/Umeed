import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, FlaskConical, HeartHandshake, PhoneOff, ShieldCheck, Users } from "lucide-react";
import { Wordmark } from "@/components/umeed/Wordmark";
import { UCard } from "@/components/umeed/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umeed — Always Near" },
      {
        name: "description",
        content:
          "Umeed helps families notice missed routines, check in gently, and coordinate someone nearby when an older parent does not respond.",
      },
      { property: "og:title", content: "Umeed — Always Near" },
      {
        property: "og:description",
        content: "The missing coordination layer between family calls and an emergency alarm.",
      },
    ],
  }),
  component: Landing,
});

const points = [
  {
    icon: Bell,
    title: "Notices missed routines",
    body: "When Margaret misses her morning check-in, Umeed notices — quietly, not with a siren.",
  },
  {
    icon: HeartHandshake,
    title: "Checks in gently, then escalates",
    body: "A reminder first, then a trusted neighbour, then family — only if needed.",
  },
  {
    icon: Users,
    title: "One person handles it — everyone sees who",
    body: "The moment someone says “I'm handling this,” the rest of the family stops worrying and stops duplicating.",
  },
  {
    icon: ShieldCheck,
    title: "She controls who sees what",
    body: "The older adult decides who's in her circle and what each person can see.",
  },
];

function Landing() {
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-12">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4 pb-8 text-center"
      >
        <Wordmark size="xl" />
        <h1 className="t-title text-text">Support their independence. Know when to step in.</h1>
        <p className="t-body text-text-soft">
          Umeed helps families notice missed routines, check in gently, and coordinate someone
          nearby when an older parent does not respond.
        </p>
      </motion.header>

      <div className="flex flex-col gap-3 pb-6">
        <Link
          to="/sign-up"
          className="t-button inline-flex min-h-16 w-full items-center justify-center rounded-full border border-sage bg-sage px-6 text-white shadow-calm active:bg-sage-dark"
        >
          Get started
        </Link>
        <Link
          to="/sign-in"
          className="t-button inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-trust bg-surface px-6 text-trust active:bg-trust-tint"
        >
          Sign in
        </Link>
      </div>

      <UCard className="mb-8 flex items-start gap-4 border-marigold/40 bg-marigold-tint">
        <FlaskConical aria-hidden size={22} className="mt-0.5 shrink-0 text-marigold" />
        <span className="t-body text-text">
          <span className="block font-semibold">This is a prototype to try out.</span>
          Use made-up names and details, not real people or medical information. No calls or texts
          are sent; alerts appear in the app. Accounts and data may be cleared at any time.
        </span>
      </UCard>

      <div className="space-y-3">
        {points.map((point) => {
          const Icon = point.icon;
          return (
            <UCard key={point.title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
                <Icon aria-hidden size={22} />
              </span>
              <span>
                <span className="t-card-title block font-semibold text-text">{point.title}</span>
                <span className="t-body mt-1 block text-text-soft">{point.body}</span>
              </span>
            </UCard>
          );
        })}
      </div>

      <div className="card-flat mt-8 space-y-2 p-4">
        <p className="t-caption flex items-start gap-3 text-text-soft">
          <PhoneOff aria-hidden size={20} className="mt-0.5 shrink-0 text-sage" />
          Umeed is not an emergency or medical service and cannot confirm that someone is safe. For
          a life-threatening emergency, always call 999.
        </p>
      </div>
    </main>
  );
}
