import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSession } from "@/features/authentication/guards";

/** Protected layout: every route under /app requires a session. */
export const Route = createFileRoute("/app")({
  beforeLoad: requireSession,
  component: () => <Outlet />,
});
