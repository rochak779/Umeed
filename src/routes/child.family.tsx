import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronRight, Mail, Phone, Plus, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EscalationLadder } from "@/components/umeed/EscalationLadder";
import { Avatar, Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/child/family")({
  head: () => ({
    meta: [
      { title: "Family — Umeed" },
      {
        name: "description",
        content:
          "Who is on the plan, what each person can see, and how Umeed reaches people when something is missed.",
      },
      { property: "og:title", content: "Family — Umeed" },
      {
        property: "og:description",
        content: "Sunita gets the first alert. Rohan sees everything you see.",
      },
    ],
  }),
  component: Family,
});

function PersonRow({
  initials,
  name,
  meta,
  access,
  verified,
  tone,
  badge,
}: {
  initials: string;
  name: string;
  meta: string;
  access: string;
  verified?: boolean | undefined;
  tone?: "sage" | "trust" | "marigold" | undefined;
  badge?: string | undefined;
}) {
  return (
    <UCard as="li" className="p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <Avatar initials={initials} size={48} tone={tone} />
        <div className="min-w-0">
          <p className="t-card-title truncate font-medium text-text">{name}</p>
          <p className="t-caption truncate text-text-soft">{meta}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {verified ? (
          <span className="t-caption inline-flex items-center gap-1 rounded-full bg-sage-tint px-2.5 py-1 text-sage-dark">
            <BadgeCheck size={14} aria-hidden /> Verified
          </span>
        ) : null}
        {badge ? (
          <span className="t-caption inline-flex items-center gap-1 rounded-full bg-trust-tint px-2.5 py-1 text-trust">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="t-body mt-2 text-text-soft">{access}</p>
    </UCard>
  );
}


function Family() {
  const { data } = useUmeed();
  const [ladder, setLadder] = useState(false);
  const parents = data.family.filter((p) => p.role === "parent");
  const siblings = data.family.filter((p) => p.role === "sibling");
  const helper = data.family.find((p) => p.role === "helper");
  const you = data.family.find((p) => p.role === "child")!;

  return (
    <>
      <TopBar title="Family" subtitle="Who sees what, in plain words" />
      <Screen className="relative">
        <section aria-labelledby="you">
          <h2 id="you" className="t-section mb-3 text-text">
            You
          </h2>
          <ul>
            <PersonRow
              initials={you.initials}
              name={`${you.name} · you`}
              meta={`${you.age} · ${you.city}`}
              access={you.access}
            />
          </ul>
        </section>

        <section aria-labelledby="parents">
          <h2 id="parents" className="t-section mb-3 text-text">
            Parents
          </h2>
          <ul className="space-y-3">
            {parents.map((p) => (
              <PersonRow
                key={p.id}
                initials={p.initials}
                name={`${p.name} · ${p.relationship}`}
                meta={`${p.age} · ${p.city} · reads ${p.language}`}
                access="Sees only her own reminders and readings. Nothing about the others."
                verified={p.verified}
                tone={p.id === "anuradha" ? "marigold" : "trust"}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="siblings">
          <h2 id="siblings" className="t-section mb-3 text-text">
            Siblings
          </h2>
          <ul className="space-y-3">
            {siblings.map((s) => (
              <PersonRow
                key={s.id}
                initials={s.initials}
                name={s.name}
                meta={`${s.age} · ${s.city}`}
                access="Sees everything you see. Gets alerts only after 30 minutes."
                tone="trust"
              />
            ))}
          </ul>
        </section>

        {helper ? (
          <section aria-labelledby="nearby">
            <h2 id="nearby" className="t-section mb-3 text-text">
              Someone nearby
            </h2>
            <ul>
              <PersonRow
                initials={helper.initials}
                name={helper.name}
                meta={`${helper.relationship} · ${helper.distance}`}
                access="Gets the first alert. Does not see medical records."
                tone="sage"
              />
            </ul>
            <div className="mt-3 flex gap-3">
              <UButton
                variant="secondary"
                full
                onClick={() => toast.success("Calling Sunita")}
              >
                <Phone size={18} aria-hidden /> Call Sunita
              </UButton>
              <Link
                to="/helper"
                className="t-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[0.875rem] border border-sage bg-surface px-4 text-sage"
              >
                See her view <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
          </section>
        ) : null}

        <UCard className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-sage-tint text-sage">
            <Plus size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-body font-medium text-text">Invite someone else</p>
            <p className="t-caption text-text-soft">A cousin, an aunt, or a second neighbour.</p>
          </div>
          <UButton
            variant="secondary"
            onClick={() => toast.success("Invite sent by WhatsApp")}
          >
            <Mail size={18} aria-hidden /> Invite
          </UButton>
        </UCard>

        <button
          onClick={() => setLadder(true)}
          className="t-body flex min-h-12 w-full items-center gap-2 rounded-[0.875rem] border border-line bg-surface px-4 py-3 text-trust"
        >
          <ShieldCheck size={18} aria-hidden /> How we reach people
          <ChevronRight size={16} aria-hidden className="ml-auto" />
        </button>

        {ladder ? (
          <div className="relative">
            <button
              onClick={() => setLadder(false)}
              aria-label="Close how we reach people"
              className="absolute right-2 top-2 z-10 flex size-12 items-center justify-center rounded-full text-text-soft"
            >
              <X size={18} aria-hidden />
            </button>
            <EscalationLadder activeIndex={1} />
          </div>
        ) : null}
      </Screen>
    </>
  );
}
