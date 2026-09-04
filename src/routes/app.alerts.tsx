import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { container } from "@/features/authentication/container";
import { resolveActiveMembership, useSession } from "@/features/authentication/SessionContext";
import { getAlertsForCircle, type AlertView } from "@/application/use-cases/getAlertsForCircle";
import { claimAlert } from "@/application/use-cases/claimAlert";
import { resolveAlert } from "@/application/use-cases/resolveAlert";
import { useAlertsRealtime } from "@/features/alerts/useAlertsRealtime";
import type { AlertRecipient, DeliveryStatus, ResolutionCode } from "@/domain/entities/alert";
import type { ResponderType } from "@/domain/entities/careCircle";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Umeed" }] }),
  component: AlertsScreen,
});

const resolutionOptions: { value: ResolutionCode; label: string }[] = [
  { value: "spoke_all_okay", label: "Spoke to her — all okay" },
  { value: "checked_in_person_all_okay", label: "Checked in person — all okay" },
  { value: "older_adult_asked_for_family", label: "She asked for a family member" },
  { value: "professional_assistance_contacted", label: "I contacted professional/medical help" },
  { value: "unable_to_reach", label: "Unable to reach her" },
  { value: "false_or_accidental", label: "False or accidental alert" },
];

const responderTypeLabel: Record<ResponderType, string> = {
  older_adult: "older adult",
  coordinator: "coordinator",
  family: "family",
  nearby_responder: "nearby responder",
};

function deliveryStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Delivery failed";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

function AlertsScreen() {
  const { session, memberships, activeCircleId } = useSession();
  const circleId = resolveActiveMembership(memberships, activeCircleId)?.circle.id;
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [recipientsByAlert, setRecipientsByAlert] = useState<Record<string, AlertRecipient[]>>({});
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});

  const memberName = (circleMemberId: string): string => memberLabels[circleMemberId] ?? "Someone";

  const load = async () => {
    if (!circleId) return;
    const views = await getAlertsForCircle(
      {
        alerts: container.alertRepository,
        careCircles: container.careCircleRepository,
        profiles: container.profileRepository,
      },
      { careCircleId: circleId },
    );
    setAlerts(views);

    const openAlerts = views.filter(
      (a) => !["resolved", "unresolved", "cancelled"].includes(a.status),
    );

    const members = await container.careCircleRepository.findMembers(circleId);
    const labelByMemberId: Record<string, string> = {};
    for (const m of members) {
      const profile = await container.profileRepository.findById(m.userId);
      labelByMemberId[m.id] =
        `${profile?.preferredName ?? m.relationship} (${responderTypeLabel[m.responderType]})`;
    }
    setMemberLabels(labelByMemberId);

    const recipientEntries = await Promise.all(
      openAlerts.map(
        async (a) => [a.id, await container.alertRepository.findRecipients(a.id)] as const,
      ),
    );
    setRecipientsByAlert(Object.fromEntries(recipientEntries));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  useAlertsRealtime(circleId, load);

  if (!session || !circleId) {
    return (
      <>
        <TopBar title="Alerts" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">Loading…</p>
        </Screen>
      </>
    );
  }

  const open = alerts.filter((a) => !["resolved", "unresolved", "cancelled"].includes(a.status));
  const past = alerts.filter((a) => ["resolved", "unresolved", "cancelled"].includes(a.status));

  return (
    <>
      <TopBar title="Alerts" back="/app" />
      <Screen>
        {open.length === 0 ? (
          <UCard className="text-center">
            <p className="t-body text-text-soft">No active alerts. All okay.</p>
          </UCard>
        ) : null}

        {open.map((alert) => (
          <UCard key={alert.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-critical" size={20} aria-hidden />
              <p className="t-card-title font-semibold text-text">
                {alert.source === "direct_help" ? "Direct help request" : "Missed routine"}
              </p>
            </div>
            <p className="t-caption text-text-soft">
              Opened {new Date(alert.openedAt).toLocaleString("en-GB")}
            </p>

            {alert.status === "claimed" ? (
              <>
                <p className="t-body text-text">
                  {alert.claimedBy === session.userId
                    ? "You're"
                    : `${alert.claimedByName ?? "Someone"} is`}{" "}
                  handling this.
                </p>
                {alert.claimedBy === session.userId ? (
                  resolvingId === alert.id ? (
                    <div className="space-y-2">
                      {resolutionOptions.map((opt) => (
                        <UButton
                          key={opt.value}
                          variant="secondary"
                          size="md"
                          full
                          onClick={async () => {
                            await resolveAlert(
                              {
                                alerts: container.alertRepository,
                                audit: container.auditRepository,
                                clock: container.clock,
                                idGenerator: container.idGenerator,
                              },
                              {
                                alertId: alert.id,
                                actorUserId: session.userId,
                                resolutionCode: opt.value,
                                resolutionNote: null,
                              },
                            );
                            setResolvingId(null);
                            await load();
                          }}
                        >
                          {opt.label}
                        </UButton>
                      ))}
                    </div>
                  ) : (
                    <UButton size="lg" full onClick={() => setResolvingId(alert.id)}>
                      Record outcome
                    </UButton>
                  )
                ) : null}
              </>
            ) : (
              <UButton
                size="lg"
                full
                onClick={async () => {
                  const result = await claimAlert(
                    {
                      alerts: container.alertRepository,
                      careCircles: container.careCircleRepository,
                      audit: container.auditRepository,
                      clock: container.clock,
                      idGenerator: container.idGenerator,
                    },
                    { alertId: alert.id, claimerUserId: session.userId, claimWindowMinutes: 15 },
                  );
                  if (!result.ok) toast.info("Someone else is already handling this.");
                  await load();
                }}
              >
                I'm handling this
              </UButton>
            )}

            {alert.source === "direct_help" ? (
              <div className="flex gap-2">
                <a
                  href="tel:999"
                  className="t-caption flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-critical text-critical"
                >
                  <PhoneCall aria-hidden size={14} /> 999
                </a>
                <a
                  href="tel:111"
                  className="t-caption flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-trust text-trust"
                >
                  <PhoneCall aria-hidden size={14} /> NHS 111
                </a>
              </div>
            ) : null}

            <p className="t-caption text-text-soft">Escalation stage {alert.currentStage}</p>

            <div className="space-y-2">
              <h3 className="t-caption text-text-soft">Who's been contacted</h3>
              <ul className="space-y-1">
                {(recipientsByAlert[alert.id] ?? []).map((r) => (
                  <li key={r.id} className="t-body flex items-center justify-between gap-2">
                    <span>
                      {memberName(r.circleMemberId)} · stage {r.stage} · {r.channel}
                    </span>
                    <span
                      className={
                        r.deliveryStatus === "failed"
                          ? "t-caption text-critical"
                          : r.deliveryStatus === "accepted" || r.deliveryStatus === "declined"
                            ? "t-caption text-text"
                            : "t-caption text-text-soft"
                      }
                    >
                      {deliveryStatusLabel(r.deliveryStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </UCard>
        ))}

        {past.length > 0 ? (
          <div className="space-y-2">
            {past.map((alert) => (
              <UCard key={alert.id} className="py-3">
                <p className="t-body text-text">
                  {resolutionOptions.find((o) => o.value === alert.resolutionCode)?.label ??
                    alert.status}
                </p>
                <p className="t-caption text-text-soft">
                  {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString("en-GB") : ""}
                </p>
              </UCard>
            ))}
          </div>
        ) : null}
      </Screen>
    </>
  );
}
