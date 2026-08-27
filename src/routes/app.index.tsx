import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, LogOut, Shield, Users } from "lucide-react";
import { Screen, SectionHeader, TopBar, UCard } from "@/components/umeed/primitives";
import { useSession } from "@/features/authentication/SessionContext";
import { container } from "@/features/authentication/container";
import { getRecentActivity, type ActivityItem } from "@/application/use-cases/getRecentActivity";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Umeed" }] }),
  component: AppHome,
});

const roleLabel: Record<string, string> = {
  older_adult: "You're the person this circle supports",
  coordinator: "You're coordinating this circle",
  family: "You're a family member in this circle",
  nearby_responder: "You're a trusted nearby responder for this circle",
};

/**
 * Minimal, real post-onboarding landing (Implementation.md §7.4–§7.6 build
 * the full role-specific home/dashboard/responder screens in Phase 3–4).
 * This screen's only job right now: route a coordinator with no circle yet
 * to onboarding, and confirm to everyone else which circle(s) they're in.
 */
function AppHome() {
  const navigate = useNavigate();
  const { loading, profile, memberships, signOut } = useSession();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const circleId = memberships[0]?.circle.id;
    if (!circleId) return;
    void getRecentActivity(
      { audit: container.auditRepository },
      { careCircleId: circleId, limit: 5 },
    ).then(setActivity);
  }, [memberships]);

  useEffect(() => {
    if (loading) return;
    if (memberships.length === 0) {
      navigate({ to: "/onboarding" });
      return;
    }
    // The older adult's experience is deliberately its own, much simpler
    // screen (Implementation.md §7.4) — she never lands on this dashboard.
    if (memberships.some((m) => m.circle.olderAdultId === profile?.id)) {
      navigate({ to: "/app/older-adult/home" });
    }
  }, [loading, memberships, profile, navigate]);

  if (loading || memberships.length === 0) {
    return (
      <Screen>
        <p className="t-body text-text-soft">Loading…</p>
      </Screen>
    );
  }

  return (
    <>
      <TopBar
        title={`Hello, ${profile?.preferredName ?? "there"}`}
        right={
          <button
            aria-label="Sign out"
            className="flex size-11 items-center justify-center rounded-full text-text-soft"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut aria-hidden size={20} />
          </button>
        }
      />
      <Screen>
        {memberships.map(({ circle, member }) => (
          <UCard key={circle.id} className="space-y-1">
            <p className="t-card-title font-semibold text-text">{circle.name}</p>
            <p className="t-body text-text-soft">{roleLabel[member.responderType]}</p>
            <p className="t-caption text-text-soft">
              {circle.status === "pending_consent"
                ? "Waiting for consent — reminders aren't active yet."
                : `Status: ${circle.status}`}
            </p>
          </UCard>
        ))}

        <Link to="/app/circle" className="block">
          <UCard className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
              <Users aria-hidden size={20} />
            </span>
            <span className="t-body font-medium text-text">Care circle</span>
          </UCard>
        </Link>

        {memberships.some((m) => m.member.responderType === "coordinator") ? (
          <Link to="/app/routines" className="block">
            <UCard className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-marigold-tint text-marigold">
                <CalendarClock aria-hidden size={20} />
              </span>
              <span className="t-body font-medium text-text">Routines</span>
            </UCard>
          </Link>
        ) : null}

        {memberships.some((m) => m.circle.olderAdultId === profile?.id) ? (
          <Link to="/app/consent" className="block">
            <UCard className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-trust-tint text-trust">
                <Shield aria-hidden size={20} />
              </span>
              <span className="t-body font-medium text-text">Privacy &amp; consent</span>
            </UCard>
          </Link>
        ) : null}

        {activity.length > 0 ? (
          <div>
            <SectionHeader title="Recent activity" />
            <div className="space-y-2">
              {activity.map((item) => (
                <UCard key={item.id} className="py-3">
                  <p className="t-body text-text">{item.label}</p>
                  <p className="t-caption text-text-soft">
                    {new Date(item.timestamp).toLocaleString("en-GB")}
                  </p>
                </UCard>
              ))}
            </div>
          </div>
        ) : null}

        <p className="t-caption text-center text-text-soft">
          Umeed helps families coordinate check-ins. It is not an emergency or medical service and
          cannot confirm that someone is safe. For a life-threatening emergency, call 999.
        </p>
      </Screen>
    </>
  );
}
