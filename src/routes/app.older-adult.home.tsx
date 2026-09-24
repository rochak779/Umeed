import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, HeartHandshake, Phone, PhoneCall } from "lucide-react";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { container } from "@/features/authentication/container";
import { useSession } from "@/features/authentication/SessionContext";
import {
  getNextRoutineForOlderAdult,
  type NextRoutineForOlderAdult,
} from "@/application/use-cases/getNextRoutineForOlderAdult";
import { acknowledgeOccurrence } from "@/application/use-cases/acknowledgeOccurrence";
import { raiseDirectHelpAlert } from "@/application/use-cases/raiseDirectHelpAlert";

export const Route = createFileRoute("/app/older-adult/home")({
  head: () => ({ meta: [{ title: "Umeed" }] }),
  component: OlderAdultHome,
});

const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

function OlderAdultHome() {
  const { session, profile, memberships } = useSession();
  const [next, setNext] = useState<NextRoutineForOlderAdult | null | undefined>(undefined);
  const [justAcknowledged, setJustAcknowledged] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);

  const load = async () => {
    if (!session) return;
    setNext(
      await getNextRoutineForOlderAdult(
        {
          careCircles: container.careCircleRepository,
          routines: container.routineRepository,
          occurrences: container.occurrenceRepository,
        },
        { olderAdultUserId: session.userId },
      ),
    );
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session || next === undefined) {
    return (
      <Screen>
        <p className="t-body text-text-soft">Loading…</p>
      </Screen>
    );
  }

  // Phone numbers aren't collected anywhere in this MVP's onboarding yet,
  // so this action stays disabled rather than dialing nothing.
  const hasCoordinator = memberships.some((m) => m.member.responderType === "coordinator");

  if (helpRequested) {
    return (
      <Screen className="flex flex-1 flex-col justify-center gap-6">
        <UCard className="flex flex-col items-center gap-3 py-8 text-center">
          <HeartHandshake className="text-critical" size={40} aria-hidden />
          <p className="t-body text-text">
            The people in your care circle have been told. Someone will be in touch shortly.
          </p>
        </UCard>
        <div className="space-y-3">
          <p className="t-caption text-center text-text-soft">
            Umeed cannot call for help on its own. If this is a life-threatening emergency:
          </p>
          <a
            href="tel:999"
            className="t-button flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-critical bg-critical-tint text-critical"
          >
            <PhoneCall aria-hidden size={18} /> Call 999
          </a>
          <a
            href="tel:111"
            className="t-button flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-trust text-trust"
          >
            <PhoneCall aria-hidden size={18} /> Call NHS 111
          </a>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="flex flex-1 flex-col justify-center gap-6">
      <div className="text-center">
        <p className="t-hero text-text">Hello, {profile?.preferredName ?? "there"}</p>
        <p className="t-body text-text-soft">{today.format(new Date())}</p>
      </div>

      {justAcknowledged ? (
        <UCard className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="text-sage" size={40} aria-hidden />
          <p className="t-body text-text">Done — thank you.</p>
        </UCard>
      ) : next ? (
        <UCard className="text-center">
          <p className="t-caption text-text-soft">Next</p>
          <p className="t-card-title font-semibold text-text">{next.routineTitle}</p>
          <p className="t-body text-text-soft">{next.localTime}</p>
        </UCard>
      ) : (
        <UCard className="text-center">
          <p className="t-body text-text-soft">Nothing due right now.</p>
        </UCard>
      )}

      <div className="flex flex-col gap-4">
        <UButton
          size="xl"
          full
          disabled={!next || justAcknowledged}
          onClick={async () => {
            if (!next) return;
            await acknowledgeOccurrence(
              {
                routines: container.routineRepository,
                occurrences: container.occurrenceRepository,
                careCircles: container.careCircleRepository,
                audit: container.auditRepository,
                clock: container.clock,
                idGenerator: container.idGenerator,
              },
              { occurrenceId: next.occurrenceId, actorUserId: session.userId, channel: "in_app" },
            );
            setJustAcknowledged(true);
          }}
        >
          {"I've done this"}
        </UButton>

        <UButton
          variant="danger"
          size="xl"
          full
          onClick={async () => {
            await raiseDirectHelpAlert(
              {
                careCircles: container.careCircleRepository,
                alerts: container.alertRepository,
                audit: container.auditRepository,
                communications: container.communicationRepository,
                notificationGateway: container.notificationGateway,
                clock: container.clock,
                idGenerator: container.idGenerator,
              },
              { olderAdultUserId: session.userId },
            );
            setHelpRequested(true);
          }}
        >
          <HeartHandshake aria-hidden size={22} /> I need help
        </UButton>

        <UButton variant="secondary" size="lg" full disabled={!hasCoordinator}>
          <Phone aria-hidden size={18} /> Call my family
        </UButton>
      </div>
    </Screen>
  );
}
