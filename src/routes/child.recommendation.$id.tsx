import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageCircle, Phone, ThumbsDown, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/child/recommendation/$id")({
  head: () => ({
    meta: [
      { title: "What to do — Umeed" },
      {
        name: "description",
        content:
          "The full reasoning behind one recommendation, three warm ways to open the conversation, and what would change the advice.",
      },
      { property: "og:title", content: "What to do — Umeed" },
      {
        property: "og:description",
        content: "Umeed does not diagnose. It notices patterns and tells you why.",
      },
    ],
  }),
  component: Recommendation,
});

const reasons = [
  "We already spoke about this",
  "She has seen her doctor",
  "The reading was wrong",
  "This is not something I can act on",
];

function Recommendation() {
  const { activeParentId, data } = useUmeed();
  const person = data.family.find((p) => p.id === activeParentId);
  const who = person?.shortName ?? "Mummy";
  const [showReasons, setShowReasons] = useState(false);
  const [thanked, setThanked] = useState(false);

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
        <h1 className="t-card-title flex-1 font-semibold text-text">What to do</h1>
      </header>

      <Screen>
        <UCard>
          <p className="t-title text-text">
            Call {who} today and ask if she has been taking her 8 am tablet.
          </p>
          <p className="t-body mt-3 text-sage">We are fairly confident about this.</p>
        </UCard>

        <UCard>
          <h2 className="t-section text-text">What we saw</h2>
          <ul className="t-body mt-3 space-y-2 text-text">
            <li>
              Her morning blood pressure moved from 128/82 to 146/92 across five mornings.
            </li>
            <li>The 8 am tablet was not confirmed on two of those mornings.</li>
            <li>Her evening calcium has been kept up, so this is not about forgetting.</li>
            <li>No prescription change since 14 March, so the dose is the same as before.</li>
          </ul>
          <h2 className="t-section mt-5 text-text">Over what period</h2>
          <p className="t-body mt-2 text-text-soft">
            The last five mornings, compared with the two weeks before them.
          </p>
          <h2 className="t-section mt-5 text-text">What would change this</h2>
          <p className="t-body mt-2 text-text-soft">
            Two mornings back under 135/85, or her telling you the tablet is being taken. Either
            one and we would go quiet again.
          </p>
          <p className="t-caption mt-4 border-t border-line pt-3 text-text-soft">
            Umeed does not diagnose. It notices patterns and tells you why.
          </p>
        </UCard>

        <UCard>
          <h2 className="t-section text-text">What to say</h2>
          <ul className="mt-3 space-y-3">
            {[
              `${who}, how has the new tablet been sitting with you in the mornings?`,
              "Do the mornings feel any different this week, heavy head or tiredness?",
              "Shall I ask Sunita to pick up your strip so you do not run out?",
            ].map((line) => (
              <li
                key={line}
                className="rounded-[0.875rem] border border-line bg-sage-tint/60 p-3"
              >
                <p className="t-body text-text">“{line}”</p>
              </li>
            ))}
          </ul>
        </UCard>

        <div className="space-y-3">
          <UButton size="lg" full onClick={() => toast.success("Calling Mummy")}>
            <Phone size={18} aria-hidden /> Call now
          </UButton>
          <UButton
            variant="secondary"
            size="lg"
            full
            onClick={() => toast.success("Opening WhatsApp for Mummy")}
          >
            <MessageCircle size={18} aria-hidden /> Message on WhatsApp
          </UButton>
          <div className="flex gap-3">
            <UButton
              variant="secondary"
              full
              onClick={() => toast.success("Marked as done")}
            >
              <Check size={18} aria-hidden /> Mark as done
            </UButton>
            <UButton variant="ghost" full onClick={() => setShowReasons(true)}>
              <ThumbsDown size={18} aria-hidden /> Not relevant
            </UButton>
          </div>
        </div>

        {showReasons ? (
          <UCard>
            <div className="flex items-start justify-between gap-3">
              <h2 className="t-section text-text">
                {thanked ? "Thank you, that helps" : "What made it not relevant?"}
              </h2>
              <button
                onClick={() => setShowReasons(false)}
                aria-label="Close"
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-text-soft"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            {thanked ? (
              <p className="t-body mt-2 text-text-soft">
                We will hold back on this one for a few days. Corrections like this make the
                next brief better.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <li key={r}>
                    <button
                      onClick={() => setThanked(true)}
                      className="t-caption min-h-12 rounded-full border border-line bg-surface px-4 text-text"
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </UCard>
        ) : null}
      </Screen>
    </>
  );
}
