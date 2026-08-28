import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { requireSession } from "@/features/authentication/guards";
import { useSession } from "@/features/authentication/SessionContext";
import { container } from "@/features/authentication/container";
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
  const { session, memberships } = useSession();
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

  return <Outlet />;
}
