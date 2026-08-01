import { createFileRoute } from "@tanstack/react-router";
import { Check, Footprints, MapPin, PhoneCall, ShieldCheck, X } from "lucide-react";
import { Avatar, Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";

export const Route = createFileRoute("/helper")({
  head: () => ({
    meta: [
      { title: "Sunita's view — Umeed" },
      {
        name: "description",
        content:
          "What the trusted neighbour sees: one request, two answers, and no medical details.",
      },
      { property: "og:title", content: "Sunita's view — Umeed" },
      {
        property: "og:description",
        content: "Helpers see only what they need to walk next door.",
      },
    ],
  }),
  component: HelperView,
});

function HelperView() {
  const { data, helperRespond } = useUmeed();
  const open = data.alerts.find((a) => a.state !== "resolved");
  const parent = data.family.find((p) => p.id === (open?.parentId ?? "anuradha"));
  const helper = data.family.find((p) => p.role === "helper");

  return (
    <>
      <TopBar
        title={helper?.name ?? "Sunita Deshpande"}
        subtitle="Trusted neighbour · 200 m away"
        back="/"
      />
      <Screen>
        {open ? (
          <UCard className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar initials={parent?.initials ?? "AR"} size={44} tone="marigold" />
              <div className="min-w-0">
                <p className="t-card-title font-semibold text-text">{open.headline}</p>
                <p className="t-caption text-text-soft">{open.time}</p>
              </div>
            </div>
            <p className="t-body text-text-soft">{open.body}</p>
            <p className="t-caption flex items-center gap-1.5 text-text-soft">
              <MapPin size={14} aria-hidden />
              {parent?.address ?? "Flat 4B, Shanti Apartments, Pune"}
            </p>
            <div className="space-y-3">
              <UButton size="lg" full onClick={() => helperRespond(true)}>
                <Footprints size={20} aria-hidden /> I am going now
              </UButton>
              <UButton variant="secondary" size="lg" full onClick={() => helperRespond(false)}>
                <X size={20} aria-hidden /> I cannot go right now
              </UButton>
              <UButton variant="ghost" size="lg" full>
                <PhoneCall size={20} aria-hidden /> Call {parent?.shortName ?? "Anuradha"} ji
              </UButton>
            </div>
          </UCard>
        ) : (
          <UCard className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage-tint text-sage">
              <Check size={22} aria-hidden />
            </span>
            <p className="t-body text-text-soft">
              Nothing needs you right now. Umeed will only ask when it matters.
            </p>
          </UCard>
        )}

        <UCard className="space-y-2">
          <p className="t-caption flex items-center gap-1.5 font-semibold text-sage">
            <ShieldCheck size={15} aria-hidden /> What you can see
          </p>
          <ul className="t-body space-y-1.5 text-text-soft">
            <li>That help was asked for, and the address.</li>
            <li>Nothing about medicines, reports or readings.</li>
            <li>{parent?.shortName ?? "Anuradha"} ji can remove you at any time.</li>
          </ul>
        </UCard>
      </Screen>
    </>
  );
}
