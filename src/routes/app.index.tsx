import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, LogOut, Settings, Shield, Users } from "lucide-react";
import { Screen, SectionHeader, TopBar, UCard } from "@/components/umeed/primitives";
import { resolveActiveMembership, useSession } from "@/features/authentication/SessionContext";
import { container } from "@/features/authentication/container";
import { getRecentActivity, type ActivityItem } from "@/application/use-cases/getRecentActivity";
import { getAlertsForCircle, type AlertView } from "@/application/use-cases/getAlertsForCircle";

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
  const { loading, profile, memberships, activeCircleId, signOut } = useSession();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [openAlerts, setOpenAlerts] = useState<AlertView[]>([]);

  useEffect(() => {
    const circleId = resolveActiveMembership(memberships, activeCircleId)?.circle.id;
    if (!circleId) return;
    void getRecentActivity(
      { audit: container.auditRepository },
      { careCircleId: circleId, limit: 5 },
    ).then(setActivity);
    void getAlertsForCircle(
      {
        alerts: container.alertRepository,
        careCircles: container.careCircleRepository,
        profiles: container.profileRepository,
      },
      { careCircleId: circleId },
    ).then((all) =>
      setOpenAlerts(all.filter((a) => !["resolved", "unresolved", "cancelled"].includes(a.status))),
    );
  }, [memberships, activeCircleId]);

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
        {openAlerts.length > 0 ? (
          <Link to="/app/alerts" className="block">
            <UCard className="flex items-center gap-3 border-critical/40 bg-critical-tint">
              <AlertTriangle className="text-critical" size={22} aria-hidden />
              <span>
                <span className="t-body block font-semibold text-critical">
                  {openAlerts.length === 1
                    ? "1 active alert"
                    : `${openAlerts.length} active alerts`}
                </span>
                <span className="t-caption text-critical">
                  {openAlerts.some((a) => a.status === "claimed")
                    ? `${openAlerts.find((a) => a.status === "claimed")?.claimedByName ?? "Someone"} is handling it`
                    : "Needs someone to respond"}
                </span>
              </span>
            </UCard>
          </Link>
        ) : null}

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

        <Link to="/app/settings" className="block">
          <UCard className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-container text-text-soft">
              <Settings aria-hidden size={20} />
            </span>
            <span className="t-body font-medium text-text">Settings</span>
          </UCard>
        </Link>

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
