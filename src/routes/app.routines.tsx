import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { resolveActiveMembership, useSession } from "@/features/authentication/SessionContext";
import { createRoutine } from "@/application/use-cases/createRoutine";
import { setRoutinePaused } from "@/application/use-cases/setRoutinePaused";
import { hasPermission } from "@/domain/policies/permissionGuard";
import type { Routine, RoutineType } from "@/domain/entities/routine";

export const Route = createFileRoute("/app/routines")({
  head: () => ({ meta: [{ title: "Routines — Umeed" }] }),
  component: RoutinesScreen,
});

const routineTypes: { value: RoutineType; label: string }[] = [
  { value: "general_checkin", label: "General check-in" },
  { value: "medication", label: "Medication" },
  { value: "meal", label: "Meal" },
  { value: "hydration", label: "Hydration" },
  { value: "appointment_prep", label: "Appointment preparation" },
  { value: "movement", label: "Movement / activity" },
  { value: "custom", label: "Custom" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function RoutinesScreen() {
  const { session, memberships, activeCircleId } = useSession();
  const membership = resolveActiveMembership(memberships, activeCircleId);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [canManageRoutines, setCanManageRoutines] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<RoutineType>("general_checkin");
  const [localTime, setLocalTime] = useState("09:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const load = async () => {
    if (!membership) return;
    setRoutines(await container.routineRepository.findByCareCircle(membership.circle.id));
    const permission = await container.careCircleRepository.findPermission(membership.member.id);
    setCanManageRoutines(hasPermission(permission, "canManageRoutines"));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.circle.id]);

  if (!session || !membership) {
    return (
      <>
        <TopBar title="Routines" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">Loading…</p>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Routines" back="/app" />
      <Screen>
        {routines.length === 0 ? (
          <p className="t-body text-text-soft">No routines yet — add one to get started.</p>
        ) : (
          routines.map((r) => (
            <UCard key={r.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="t-card-title font-semibold text-text">{r.title}</p>
                {!r.enabled ? (
                  <span className="t-caption rounded-full border border-line px-2 py-0.5 text-text-soft">
                    Paused
                  </span>
                ) : null}
              </div>
              <p className="t-caption text-text-soft">
                {routineTypes.find((t) => t.value === r.type)?.label} · {r.localTime} ·{" "}
                {r.daysOfWeek.length === 7
                  ? "Every day"
                  : r.daysOfWeek.map((d) => DAYS[d]).join(", ")}
              </p>
              {canManageRoutines ? (
                <UButton
                  variant="secondary"
                  size="md"
                  onClick={async () => {
                    await setRoutinePaused(
                      {
                        routines: container.routineRepository,
                        careCircles: container.careCircleRepository,
                        audit: container.auditRepository,
                        clock: container.clock,
                        idGenerator: container.idGenerator,
                      },
                      {
                        routineId: r.id,
                        actorUserId: session.userId,
                        paused: r.enabled,
                      },
                    );
                    await load();
                  }}
                >
                  {r.enabled ? "Pause routine" : "Resume routine"}
                </UButton>
              ) : null}
            </UCard>
          ))
        )}

        {creating ? (
          <UCard>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  await createRoutine(
                    {
                      careCircles: container.careCircleRepository,
                      routines: container.routineRepository,
                      occurrences: container.occurrenceRepository,
                      audit: container.auditRepository,
                      clock: container.clock,
                      idGenerator: container.idGenerator,
                    },
                    {
                      actorUserId: session.userId,
                      careCircleId: membership.circle.id,
                      olderAdultId: membership.circle.olderAdultId ?? "",
                      type,
                      title,
                      description: null,
                      timezone: "Europe/London",
                      localTime,
                      daysOfWeek: days,
                      startDate: new Date().toISOString().slice(0, 10),
                      endDate: null,
                      gracePeriodMinutes: 30,
                    },
                  );
                  setCreating(false);
                  setTitle("");
                  await load();
                } catch {
                  setError("Couldn't create that routine. Check the details and try again.");
                }
              }}
            >
              <Field
                id="title"
                label="Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="space-y-1.5">
                <label htmlFor="type" className="t-body block font-medium text-text">
                  Type
                </label>
                <select
                  id="type"
                  className="t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3 text-text"
                  value={type}
                  onChange={(e) => setType(e.target.value as RoutineType)}
                >
                  {routineTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                id="localTime"
                label="Time"
                type="time"
                required
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value)}
              />
              <div className="space-y-1.5">
                <p className="t-body font-medium text-text">Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((label, index) => (
                    <button
                      type="button"
                      key={label}
                      aria-pressed={days.includes(index)}
                      className={`min-h-11 rounded-full border px-3 t-caption ${
                        days.includes(index)
                          ? "border-sage bg-sage-tint text-sage-dark"
                          : "border-line text-text-soft"
                      }`}
                      onClick={() =>
                        setDays((d) =>
                          d.includes(index) ? d.filter((x) => x !== index) : [...d, index],
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {error ? <p className="t-caption text-critical">{error}</p> : null}
              <UButton type="submit" size="lg" full>
                Save routine
              </UButton>
            </form>
          </UCard>
        ) : (
          <UButton variant="secondary" size="lg" full onClick={() => setCreating(true)}>
            <Plus aria-hidden size={18} /> Add a routine
          </UButton>
        )}
      </Screen>
    </>
  );
}
