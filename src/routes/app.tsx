import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { requireSession } from "@/features/authentication/guards";
import { useSession } from "@/features/authentication/SessionContext";
import { container } from "@/features/authentication/container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocalScheduler } from "../infrastructure/local/LocalScheduler";
import type { PollDueWorkDeps } from "../application/use-cases/pollDueWork";

const POLL_INTERVAL_MS = 15_000;

/**
 * Protected layout: every route under /app requires a session. Also mounts
 * the local scheduler (Implementation.md §11.5) for the lifetime of the
 * authenticated app shell — it silently drives occurrence generation,
 * missed-routine alerting and claim expiry in the background. This is not a
 * product feature and must never surface a control in the UI.
 */
export const Route = createFileRoute("/app")({
  beforeLoad: requireSession,
  component: AppLayout,
});

function AppLayout() {
  const { session, memberships, activeCircleId, setActiveCircleId } = useSession();
  const schedulerRef = useRef<LocalScheduler | null>(null);
  const careCircleIdsRef = useRef<string[]>([]);
  careCircleIdsRef.current = memberships.map((m) => m.circle.id);

  useEffect(() => {
    if (!session || memberships.length === 0) return;

    if (!schedulerRef.current) {
      const deps: PollDueWorkDeps = {
        routines: container.routineRepository,
        occurrences: container.occurrenceRepository,
        careCircles: container.careCircleRepository,
        alerts: container.alertRepository,
        audit: container.auditRepository,
        communications: container.communicationRepository,
        notificationGateway: container.notificationGateway,
        clock: container.clock,
        idGenerator: container.idGenerator,
      };
      schedulerRef.current = new LocalScheduler(deps, () => careCircleIdsRef.current);
    }

    schedulerRef.current.start(POLL_INTERVAL_MS);

    return () => {
      schedulerRef.current?.stop();
      schedulerRef.current = null;
    };
  }, [session, memberships.length]);

  return (
    <>
      {/*
        Care-circle switcher: which circle's data is currently being viewed.
        This is NOT a role switcher — a member's role/permissions still come
        entirely from their membership record in the active circle, never
        from a client-controlled choice here (Implementation.md §7.2). Only
        shown to accounts that belong to more than one circle.
      */}
      {memberships.length > 1 ? (
        <div className="flex items-center justify-end gap-2 border-b border-line bg-bg px-4 py-2">
          <label htmlFor="active-circle-switcher" className="t-caption text-text-soft">
            Circle
          </label>
          <Select
            {...(activeCircleId ? { value: activeCircleId } : {})}
            onValueChange={(id) => setActiveCircleId(id)}
          >
            <SelectTrigger
              id="active-circle-switcher"
              aria-label="Switch care circle"
              className="h-11 min-h-11 w-auto min-w-[8rem]"
            >
              <SelectValue placeholder="Select a circle" />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((m) => (
                <SelectItem key={m.circle.id} value={m.circle.id} className="min-h-11">
                  {m.circle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Outlet />
    </>
  );
}
