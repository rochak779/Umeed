import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, HeartHandshake, PhoneCall, X } from "lucide-react";
import { Avatar, Screen, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/parent/help")({
  head: () => ({
    meta: [
      { title: "Ask for help — Umeed" },
      {
        name: "description",
        content:
          "One press tells the neighbour and the family together, with ten seconds to change your mind.",
      },
      { property: "og:title", content: "Ask for help — Umeed" },
      {
        property: "og:description",
        content: "You always see exactly who has been told.",
      },
    ],
  }),
  component: ParentHelp,
});

function ParentHelp() {
  const navigate = useNavigate();
  const { data, triggerSOS, cancelSOS } = useUmeed();
  const [phase, setPhase] = useState<"ask" | "countdown" | "sent">("ask");
  const [left, setLeft] = useState(10);
  const helper = data.family.find((p) => p.role === "helper");
  const child = data.family.find((p) => p.role === "child");
  const sos = data.alerts.find((a) => a.level === "sos");

  useEffect(() => {
    if (phase !== "countdown") return;
    if (left === 0) {
      triggerSOS("anuradha");
      setPhase("sent");
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, triggerSOS]);

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3">
        <Link
          to="/parent/home"
          aria-label="Go back"
          className="flex size-12 items-center justify-center rounded-full text-text"
        >
          <X size={24} aria-hidden />
        </Link>
        <h1 className="t-card-title font-semibold text-text">Ask for help</h1>
      </header>

      <Screen className="px-5">
        {phase === "ask" ? (
          <>
            <p className="t-body text-text-soft">
              This tells {helper?.shortName ?? "Sunita"} next door and{" "}
              {child?.shortName ?? "Aditi"} at the same moment. Nobody else.
            </p>
            <button
              onClick={() => {
                setLeft(10);
                setPhase("countdown");
              }}
              className="mx-auto flex size-52 flex-col items-center justify-center gap-2 rounded-full bg-alert text-white shadow-lift"
            >
              <HeartHandshake size={52} aria-hidden />
              <span className="t-card-title font-semibold">Press for help</span>
            </button>
            <UCard className="space-y-3">
              <p className="t-caption text-text-soft">Or just call someone</p>
              {[helper, child].filter(Boolean).map((p) => (
                <div key={p!.id} className="flex items-center gap-3">
                  <Avatar initials={p!.initials} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium text-text">{p!.name}</p>
                    <p className="t-caption text-text-soft">
                      {p!.relationship}
                      {p!.distance ? ` · ${p!.distance}` : ""}
                    </p>
                  </div>
                  <UButton variant="secondary" aria-label={`Call ${p!.shortName}`}>
                    <PhoneCall size={20} aria-hidden />
                  </UButton>
                </div>
              ))}
            </UCard>
          </>
        ) : null}

        {phase === "countdown" ? (
          <UCard className="flex flex-col items-center gap-5 py-10 text-center">
            <p className="t-hero text-alert" aria-live="assertive">
              {left}
            </p>
            <p className="t-body text-text-soft">
              Telling {helper?.shortName ?? "Sunita"} and {child?.shortName ?? "Aditi"} in {left}{" "}
              seconds.
            </p>
            <UButton
              variant="secondary"
              size="xl"
              full
              onClick={() => {
                setPhase("ask");
                setLeft(10);
              }}
            >
              I am fine, stop
            </UButton>
          </UCard>
        ) : null}

        {phase === "sent" ? (
          <>
            <UCard className="space-y-4">
              <p className="t-card-title font-semibold text-text">Help is coming</p>
              <ul className="space-y-3">
                {(sos?.told ?? [helper?.shortName, child?.shortName]).map((t) => (
                  <li key={String(t)} className="t-body flex items-center gap-2 text-text">
                    <Check size={20} className="text-sage" aria-hidden />
                    {t} has been told
                  </li>
                ))}
              </ul>
              <p className="t-body text-text-soft" aria-live="polite">
                {sos?.state === "on-the-way"
                  ? `${helper?.shortName ?? "Sunita"} is walking over now.`
                  : `${helper?.shortName ?? "Sunita"} is 200 metres away.`}
              </p>
            </UCard>
            <UButton
              variant="secondary"
              size="xl"
              full
              onClick={() => {
                cancelSOS();
                navigate({ to: "/parent/home" });
              }}
            >
              I am okay now
            </UButton>
          </>
        ) : null}
      </Screen>
    </>
  );
}
