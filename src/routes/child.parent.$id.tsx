import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Camera,
  FileText,
  HeartHandshake,
  Mic,
  Phone,
  Pill,
  Plus,
  Stethoscope,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  Avatar,
  DotStrip,
  EmptyState,
  Screen,
  StatusPill,
  UButton,
  UCard,
} from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/parent/$id")({
  head: () => ({
    meta: [
      { title: "Parent profile — Umeed" },
      {
        name: "description",
        content:
          "Conditions, medicines, fourteen days of readings, reminders and a full timeline for one parent.",
      },
      { property: "og:title", content: "Parent profile — Umeed" },
      {
        property: "og:description",
        content: "Every reading says how it arrived: said out loud, or from a photo.",
      },
    ],
  }),
  component: ParentProfile,
});

const TABS = ["Overview", "Vitals", "Reminders", "Timeline"] as const;

function VitalChart({
  title,
  unit,
  summary,
  series,
  low,
  high,
  lastLine,
}: {
  title: string;
  unit: string;
  summary: string;
  series: { date: string; value: number }[];
  low: number;
  high: number;
  lastLine: string;
}) {
  if (series.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        line="No readings yet. Ask Mummy to tap the green button and say one out loud."
      />
    );
  }
  return (
    <UCard>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="t-card-title font-medium text-text">{title}</h3>
        <span className="t-caption text-text-soft">{unit}</span>
      </div>
      <p className="t-body mt-1 text-text-soft">{summary}</p>
      <div className="mt-3 h-36" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <ReferenceArea y1={low} y2={high} fill="var(--sage-tint)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-soft)", fontSize: 11 }}
              tickFormatter={(d: string) => d.slice(8)}
              stroke="var(--border)"
            />
            <YAxis tick={{ fill: "var(--text-soft)", fontSize: 11 }} stroke="var(--border)" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--sage)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--sage)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="t-caption mt-2 text-text">{lastLine}</p>
      <p className="t-caption text-text-soft">
        The soft green band is the usual range for her age.
      </p>
    </UCard>
  );
}

function ParentProfile() {
  const { id } = Route.useParams();
  const { data, addReminder, setActiveParentId } = useUmeed();
  const person = data.family.find((p) => p.id === id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState({
    kind: "medicine" as "medicine" | "vital" | "appointment",
    label: "",
    time: "8:00 am",
    frequency: "Every day",
    parentId: id,
  });

  const helper = data.family.find((p) => p.role === "helper");
  const vitals = useMemo(
    () =>
      data.vitals
        .filter((v) => v.parentId === id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.vitals, id],
  );
  const reminders = data.reminders.filter((r) => r.parentId === id);
  const events = data.timeline.filter((e) => e.parentId === id);
  const last = vitals[vitals.length - 1];

  if (!person) {
    return (
      <Screen>
        <EmptyState line="We could not find that parent. Try again from your home screen." />
      </Screen>
    );
  }

  const grouped = events.reduce<Record<string, typeof events>>((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});

  const eventIcon = {
    vital: Activity,
    document: FileText,
    reminder: Pill,
    alert: HeartHandshake,
    helper: HeartHandshake,
    call: Phone,
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            to="/child/home"
            aria-label="Go back"
            className="flex size-12 items-center justify-center rounded-full text-text"
          >
            <X size={22} aria-hidden />
          </Link>
          <Avatar
            initials={person.initials}
            size={40}
            tone={person.id === "anuradha" ? "marigold" : "trust"}
          />
          <div className="min-w-0 flex-1">
            <h1 className="t-card-title font-semibold text-text">{person.name}</h1>
            <p className="t-caption text-text-soft">
              {person.relationship} · {person.city}
            </p>
          </div>
          <StatusPill status={data.statuses[person.id] ?? "steady"} />
        </div>
        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setActiveParentId(person.id);
              }}
              aria-pressed={tab === t}
              className={cn(
                "t-caption min-h-12 shrink-0 rounded-full border px-4",
                tab === t
                  ? "border-sage bg-sage-tint text-sage"
                  : "border-line bg-surface text-text-soft",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <Screen>
        {tab === "Overview" ? (
          <>
            <UCard>
              <h2 className="t-section text-text">About {person.shortName}</h2>
              <dl className="mt-3 divide-y divide-line">
                {[
                  ["Age", `${person.age}`],
                  ["City", person.city],
                  ["Day to day", person.occupation ?? "—"],
                  ["Conditions", (person.conditions ?? []).join(", ") || "None noted"],
                  ["Reads best in", person.language ?? "English"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4 py-2.5">
                    <dt className="t-caption w-28 shrink-0 text-text-soft">{k}</dt>
                    <dd className="t-body text-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </UCard>

            <UCard>
              <h2 className="t-section text-text">Medicines right now</h2>
              <ul className="mt-3 space-y-3">
                {reminders
                  .filter((r) => r.kind === "medicine")
                  .map((r) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-sage-tint text-sage">
                        <Pill size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="t-body font-medium text-text">{r.label}</p>
                        <p className="t-caption text-text-soft">
                          {r.time} · {r.frequency}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            </UCard>

            {helper ? (
              <UCard className="flex items-center gap-3">
                <Avatar initials={helper.initials} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="t-body font-medium text-text">{helper.name}</p>
                  <p className="t-caption text-text-soft">
                    {helper.relationship} · {helper.distance}
                  </p>
                </div>
                <UButton
                  variant="secondary"
                  onClick={() => toast.success("Calling Sunita")}
                  aria-label="Call Sunita"
                >
                  <Phone size={18} aria-hidden /> Call
                </UButton>
              </UCard>
            ) : null}

            <section aria-labelledby="recent">
              <h2 id="recent" className="t-section mb-3 text-text">
                Lately
              </h2>
              {events.length === 0 ? (
                <EmptyState line="Umeed is still getting to know their week." />
              ) : (
                <ul className="space-y-3">
                  {events.slice(0, 5).map((e) => {
                    const Icon = eventIcon[e.kind];
                    return (
                      <li key={e.id} className="card-calm flex items-start gap-3 p-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-tint text-sage">
                          <Icon size={16} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="t-body text-text">{e.title}</p>
                          <p className="t-caption text-text-soft">
                            {e.detail ? `${e.detail} · ` : ""}
                            {e.time}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}

        {tab === "Vitals" ? (
          <>
            <VitalChart
              title="Blood pressure"
              unit="mm Hg, upper number"
              summary={`Climbing gently over the last five mornings.`}
              series={vitals
                .filter((v) => v.systolic)
                .map((v) => ({ date: v.date, value: v.systolic! }))}
              low={110}
              high={135}
              lastLine={`Last reading ${last?.systolic ?? "—"}/${last?.diastolic ?? "—"} at ${
                last?.time ?? "—"
              }, ${last?.loggedBy === "photo" ? "read from a photo" : "said out loud"}.`}
            />
            <VitalChart
              title="Pulse"
              unit="beats a minute"
              summary="Steady all fortnight."
              series={vitals
                .filter((v) => v.pulse)
                .map((v) => ({ date: v.date, value: v.pulse! }))}
              low={60}
              high={90}
              lastLine={`Last reading ${last?.pulse ?? "—"} at ${last?.time ?? "—"}, said out loud.`}
            />
            <VitalChart
              title="Sugar"
              unit="mg/dL, after food"
              summary={
                vitals.some((v) => v.sugar)
                  ? "Mostly inside the usual range, with two higher evenings."
                  : "Nothing to show for sugar yet."
              }
              series={vitals
                .filter((v) => v.sugar)
                .map((v) => ({ date: v.date, value: v.sugar! }))}
              low={100}
              high={160}
              lastLine={`Last reading ${last?.sugar ?? "—"} at ${last?.time ?? "—"}.`}
            />
            <VitalChart
              title="Weight"
              unit="kilograms"
              summary="Holding within half a kilo."
              series={vitals
                .filter((v) => v.weight)
                .map((v) => ({ date: v.date, value: Number(v.weight!.toFixed(1)) }))}
              low={55}
              high={75}
              lastLine={`Last reading ${last?.weight?.toFixed(1) ?? "—"} kg.`}
            />
          </>
        ) : null}

        {tab === "Reminders" ? (
          <>
            {reminders.length === 0 ? (
              <EmptyState
                icon={Pill}
                line="No reminders set yet. Add the first medicine and we take it from there."
              />
            ) : (
              <ul className="space-y-3">
                {reminders.map((r) => {
                  const Icon =
                    r.kind === "medicine" ? Pill : r.kind === "vital" ? Activity : Stethoscope;
                  return (
                    <li key={r.id} className="card-calm p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-full bg-sage-tint text-sage">
                          <Icon size={18} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="t-body font-medium text-text">{r.label}</p>
                          <p className="t-caption text-text-soft">
                            {r.time} · {r.frequency}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <DotStrip days={r.days} label={`Last seven days of ${r.label}`} />
                        <span className="t-caption text-text-soft">
                          {r.days.filter((d) => d === "done").length} of 7 kept up
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <UButton variant="secondary" size="lg" full onClick={() => setSheet(true)}>
              <Plus size={18} aria-hidden /> Add reminder
            </UButton>
          </>
        ) : null}

        {tab === "Timeline" ? (
          events.length === 0 ? (
            <EmptyState line="Umeed is still getting to know their week." />
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, list]) => (
                <section key={date}>
                  <h2 className="t-caption mb-2 font-semibold uppercase tracking-wide text-text-soft">
                    {date}
                  </h2>
                  <ul className="space-y-3">
                    {list.map((e) => {
                      const Icon = eventIcon[e.kind];
                      return (
                        <li key={e.id} className="card-calm flex items-start gap-3 p-4">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-tint text-sage">
                            <Icon size={16} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="t-body text-text">{e.title}</p>
                            <p className="t-caption text-text-soft">
                              {e.detail ? `${e.detail} · ` : ""}
                              {e.time}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )
        ) : null}
      </Screen>

      {sheet ? (
        <div
          className="absolute inset-0 z-40 flex items-end bg-text/30"
          role="dialog"
          aria-label="Add a reminder"
        >
          <div className="w-full space-y-3 rounded-t-[1rem] bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="t-section text-text">Add reminder</h2>
              <button
                onClick={() => setSheet(false)}
                aria-label="Close"
                className="flex size-12 items-center justify-center rounded-full text-text-soft"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <label className="block">
              <span className="t-caption mb-1 block font-medium text-text">Type</span>
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({ ...draft, kind: e.target.value as typeof draft.kind })
                }
                className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3"
              >
                <option value="medicine">Medicine</option>
                <option value="vital">Reading</option>
                <option value="appointment">Appointment</option>
              </select>
            </label>
            <label className="block">
              <span className="t-caption mb-1 block font-medium text-text">What to call it</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Telmisartan 40 mg"
                className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3"
              />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="t-caption mb-1 block font-medium text-text">Time</span>
                <input
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3"
                />
              </label>
              <label className="block flex-1">
                <span className="t-caption mb-1 block font-medium text-text">Days</span>
                <select
                  value={draft.frequency}
                  onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                  className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3"
                >
                  <option>Every day</option>
                  <option>Weekdays</option>
                  <option>Once a week</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="t-caption mb-1 block font-medium text-text">Which parent</span>
              <select
                value={draft.parentId}
                onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
                className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3"
              >
                {data.family
                  .filter((p) => p.role === "parent")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <UButton
              size="lg"
              full
              onClick={() => {
                if (!draft.label.trim()) {
                  toast.error("Give the reminder a name she will recognise");
                  return;
                }
                addReminder({
                  parentId: draft.parentId,
                  kind: draft.kind,
                  label: draft.label,
                  time: draft.time,
                  frequency: draft.frequency,
                });
                setSheet(false);
                setDraft({ ...draft, label: "" });
                toast.success("Reminder added");
              }}
            >
              Save reminder
            </UButton>
            <p className="t-caption flex items-center gap-2 text-text-soft">
              <Mic size={14} aria-hidden /> She can confirm by voice, or
              <Camera size={14} aria-hidden /> send a photo instead.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
