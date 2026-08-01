import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <Outlet />
    </div>
  );
}
