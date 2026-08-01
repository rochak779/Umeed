import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { BottomNav } from "@/components/umeed/primitives";

export const Route = createFileRoute("/child")({
  component: ChildLayout,
});

function ChildLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = path.startsWith("/child/onboarding");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}
