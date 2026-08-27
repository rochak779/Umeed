import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Screen, TopBar, UCard } from "@/components/umeed/primitives";
import { container } from "@/features/authentication/container";
import { useSession } from "@/features/authentication/SessionContext";
import { setConsent } from "@/application/use-cases/setConsent";
import type { ConsentRecord, ConsentType } from "@/domain/entities/consent";

export const Route = createFileRoute("/app/consent")({
  head: () => ({ meta: [{ title: "Privacy & consent — Umeed" }] }),
  component: ConsentScreen,
});

const toggles: { type: ConsentType; label: string; hint: string }[] = [
  {
    type: "share_address_with_nearby_responder",
    label: "Share my address with my nearby responder",
    hint: "Needed so they know where to check on you in person.",
  },
  {
    type: "automated_calls_enabled",
    label: "Allow automated check-in calls",
    hint: "If you miss a reminder, Umeed can try calling you.",
  },
];

function ConsentScreen() {
  const { session, memberships } = useSession();
  const membership = memberships.find((m) => m.circle.olderAdultId === session?.userId);
  const [records, setRecords] = useState<ConsentRecord[]>([]);

  const load = async () => {
    if (!membership) return;
    setRecords(await container.consentRepository.findByCareCircle(membership.circle.id));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.circle.id]);

  if (!session || !membership) {
    return (
      <>
        <TopBar title="Privacy & consent" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">
            This screen is only available to the person a circle is supporting.
          </p>
        </Screen>
      </>
    );
  }

  const statusFor = (type: ConsentType) =>
    records.find((r) => r.consentType === type)?.status ?? "revoked";

  return (
    <>
      <TopBar title="Privacy & consent" back="/app" />
      <Screen>
        {toggles.map((t) => {
          const granted = statusFor(t.type) === "granted";
          return (
            <UCard key={t.type} className="flex items-center justify-between gap-4">
              <div>
                <p className="t-body font-medium text-text">{t.label}</p>
                <p className="t-caption text-text-soft">{t.hint}</p>
              </div>
              <button
                role="switch"
                aria-checked={granted}
                aria-label={t.label}
                className={`flex min-h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
                  granted ? "bg-sage justify-end" : "bg-line justify-start"
                }`}
                onClick={async () => {
                  await setConsent(
                    {
                      careCircles: container.careCircleRepository,
                      consents: container.consentRepository,
                      audit: container.auditRepository,
                      clock: container.clock,
                      idGenerator: container.idGenerator,
                    },
                    {
                      careCircleId: membership.circle.id,
                      actorUserId: session.userId,
                      consentType: t.type,
                      status: granted ? "revoked" : "granted",
                    },
                  );
                  await load();
                }}
              >
                <span className="size-6 rounded-full bg-white shadow" />
              </button>
            </UCard>
          );
        })}
        <p className="t-caption text-center text-text-soft">
          You can change these at any time. Changes take effect immediately.
        </p>
      </Screen>
    </>
  );
}
