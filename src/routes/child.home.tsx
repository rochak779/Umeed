import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  Leaf,
  MessageSquare,
  Phone,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  DotStrip,
  Screen,
  Sparkline,
  StatusPill,
  UButton,
  UCard,
  WhyPanel,
} from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { todayLabel } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/home")({
  head: () => ({
    meta: [
      { title: "Today — Umeed" },
      {
        name: "description",
        content:
          "One question answered: do I need to do anything for Mummy or Papa today?",
      },
      { property: "og:title", content: "Today — Umeed" },
      {
        property: "og:description",
        content: "A single recommended action, and the reasons behind it.",
      },
    ],
  }),
  component: ChildHome,
});

function ChildHome() {
  const { data, activeParentId, setActiveParentId } = useUmeed();
  const navigate = useNavigate();
  const parents = data.family.filter((p) => p.role === "parent");
  const active = parents.find((p) => p.id === activeParentId) ?? parents[0]!;
  const status = data.statuses[active.id] ?? "steady";
  const quiet = status === "steady";

  const vitals = data.vitals
    .filter((v) => v.parentId === active.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = vitals[vitals.length - 1];
  const bpSeries = vitals.filter((v) => v.systolic).map((v) => v.systolic!);
  const pulseSeries = vitals.filter((v) => v.pulse).map((v) => v.pulse!);
  const morning = data.reminders.find(
    (r) => r.parentId === active.id && r.kind === "medicine",
  );
  const alerts = data.alerts.filter((a) => !a.acknowledged);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="t-card-title font-semibold text-text">Good morning, Aditi</h1>
          <p className="t-caption text-text-soft">{todayLabel}</p>
        </div>
        <Link
          to="/child/alerts"
          aria-label={`Alerts, ${alerts.length} needing you`}
          className="relative flex size-12 items-center justify-center rounded-full text-text"
        >
          <Bell size={22} aria-hidden />
          {alerts.length ? (
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-marigold" />
          ) : null}
        </Link>
        <Avatar initials="AR" size={40} />
      </header>

      <Screen>
        <div className="grid grid-cols-2 gap-3">
          {parents.map((p) => {
            const isActive = p.id === active.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveParentId(p.id)}
                aria-pressed={isActive}
                className={cn(
                  "card-calm flex flex-col items-start gap-2 p-3 text-left transition-colors",
                  isActive && "border-sage bg-sage-tint/50",
                )}
              >
                <span className="flex items-center gap-2">
                  <Avatar
                    initials={p.initials}
                    size={36}
                    tone={p.id === "anuradha" ? "marigold" : "trust"}
                  />
                  <span className="t-body font-medium text-text">{p.shortName}</span>
                </span>
                <StatusPill status={data.statuses[p.id] ?? "steady"} />
              </button>
            );
          })}
        </div>

        {quiet ? (
          <UCard className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-sage-tint text-sage">
              <Leaf size={26} aria-hidden />
            </span>
            <h2 className="t-section text-text">Everything looks normal today</h2>
            <p className="t-body max-w-[17rem] text-text-soft">
              We will let you know if anything needs you.
            </p>
            <Link
              to="/child/parent/$id"
              params={{ id: active.id }}
              className="t-caption min-h-12 px-4 py-3 text-trust underline"
            >
              See {active.shortName}'s week anyway
            </Link>
          </UCard>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="card-calm p-4"
            >
              <span className="t-caption inline-flex items-center gap-1.5 rounded-full bg-marigold/10 px-2.5 py-1 text-marigold">
                <TrendingUp size={14} aria-hidden /> Worth a call
              </span>
              <h2 className="t-section mt-3 text-text">
                {active.shortName}'s blood pressure has been climbing this week.
              </h2>
              <p className="t-body mt-2 text-text-soft">
                Logged 5 of 7 days. Last reading {last?.systolic ?? 146}/
                {last?.diastolic ?? 92} this morning.
              </p>
            </motion.section>

            <UCard>
              <p className="t-caption font-medium uppercase tracking-wide text-sage">
                One thing to do today
              </p>
              <p className="t-card-title mt-2 text-text">
                Call {active.shortName} today and ask if she has been taking her 8 am tablet.
              </p>
              <div className="mt-4 flex gap-3">
                <UButton
                  full
                  onClick={() => toast.success("Calling Mummy", { icon: <Phone size={16} /> })}
                >
                  <Phone size={18} aria-hidden /> Call now
                </UButton>
                <UButton
                  variant="secondary"
                  full
                  onClick={() => toast.success("We will nudge you at 8 pm tonight")}
                >
                  Remind me tonight
                </UButton>
              </div>
              <WhyPanel
                lines={[
                  "Average blood pressure is up from 129/83 to 141/89 over 5 days.",
                  "The 8 am reminder was missed twice this week.",
                  "No prescription change since 14 March.",
                ]}
              />
              <button
                onClick={() => navigate({ to: "/child/recommendation/$id", params: { id: "bp-climb" } })}
                className="t-caption mt-3 inline-flex min-h-12 items-center gap-1 text-trust underline"
              >
                See the full reasoning <ArrowUpRight size={14} aria-hidden />
              </button>
            </UCard>

            <section aria-labelledby="changed">
              <h2 id="changed" className="t-section mb-3 text-text">
                What changed
              </h2>
              <ul className="space-y-3">
                <li className="card-calm flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium text-text">Blood pressure</p>
                    <p className="t-caption text-text-soft">
                      Up from 129/83 to 141/89 over 5 days
                    </p>
                  </div>
                  <Sparkline
                    values={bpSeries.slice(-7)}
                    tone="marigold"
                    label="Blood pressure rising over the last week"
                  />
                </li>
                <li className="card-calm flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium text-text">Morning tablet</p>
                    <p className="t-caption text-text-soft">
                      Missed twice in a row, we reminded her again
                    </p>
                  </div>
                  {morning ? (
                    <DotStrip
                      days={morning.days}
                      label="Last seven days of the morning tablet"
                    />
                  ) : null}
                </li>
                <li className="card-calm flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium text-text">Pulse</p>
                    <p className="t-caption text-text-soft">Steady, around 76 beats a minute</p>
                  </div>
                  <Sparkline values={pulseSeries.slice(-7)} label="Pulse steady this week" />
                </li>
              </ul>
            </section>

            <div className="flex gap-3">
              <UButton
                variant="secondary"
                full
                onClick={() => navigate({ to: "/child/brief" })}
              >
                <MessageSquare size={18} aria-hidden /> This week's Care Brief
              </UButton>
            </div>
          </>
        )}
      </Screen>
    </>
  );
}
