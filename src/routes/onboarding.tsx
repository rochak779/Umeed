import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { requireSession } from "@/features/authentication/guards";
import { startCareCircle } from "@/application/use-cases/startCareCircle";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await requireSession();
    if (!session) return; // SSR pass-through; see guards.ts
    const existing = await container.careCircleRepository.findByUserId(session.userId);
    if (existing.length > 0) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Set up your circle — Umeed" }] }),
  component: Onboarding,
});

type Step = "explain" | "who" | "invited";

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("explain");
  const [preferredName, setPreferredName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = await container.authProvider.getSession();
    if (!session) return;
    setSubmitting(true);
    const { plaintextToken } = await startCareCircle(
      {
        careCircleRepository: container.careCircleRepository,
        invitationRepository: container.invitationRepository,
        auditRepository: container.auditRepository,
        clock: container.clock,
        idGenerator: container.idGenerator,
      },
      {
        coordinatorUserId: session.userId,
        olderAdultPreferredName: preferredName,
        invitedEmail: contactEmail || null,
        invitedPhone: null,
      },
    );
    setSubmitting(false);
    setInviteLink(`${window.location.origin}/invite/${plaintextToken}`);
    setStep("invited");
  };

  if (step === "explain") {
    return (
      <>
        <TopBar title="Set up your circle" />
        <Screen>
          <UCard className="space-y-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
              <HeartHandshake aria-hidden size={22} />
            </span>
            <p className="t-body text-text">
              Umeed helps you notice missed routines and coordinate a response — it is not an
              emergency or medical service, and it cannot confirm that someone is safe.
            </p>
            <p className="t-body text-text-soft">
              The person you're supporting must know about and agree to this before it's active.
              Nothing is shared, and no reminders go out, until they've accepted.
            </p>
          </UCard>
          <UButton size="lg" full onClick={() => setStep("who")}>
            Continue
          </UButton>
        </Screen>
      </>
    );
  }

  if (step === "who") {
    return (
      <>
        <TopBar title="Who are you supporting?" />
        <Screen>
          <UCard>
            <form className="space-y-4" onSubmit={onCreateCircle}>
              <Field
                id="preferredName"
                label="Their preferred name"
                placeholder="Margaret"
                required
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
              <Field
                id="contactEmail"
                label="Their email (to invite them)"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                hint="They'll use this to accept the invitation and set up their own account."
              />
              <UButton type="submit" size="lg" full disabled={submitting}>
                {submitting ? "Creating circle…" : "Create circle and invite them"}
              </UButton>
            </form>
          </UCard>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Waiting for consent" />
      <Screen>
        <UCard className="space-y-3">
          <p className="t-body text-text">
            {preferredName}'s circle has been created. Escalation stays off until {preferredName}{" "}
            accepts.
          </p>
          <p className="t-caption text-text-soft">
            Share this link with them (by email, text, or read it out loud):
          </p>
          <div className="flex items-center gap-2 rounded-[0.75rem] border border-line bg-surface p-3">
            <code className="t-caption min-w-0 flex-1 break-all text-text">{inviteLink}</code>
            <button
              type="button"
              aria-label="Copy invitation link"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-trust"
              onClick={() => {
                if (inviteLink) void navigator.clipboard.writeText(inviteLink);
                toast.success("Link copied");
              }}
            >
              <Copy aria-hidden size={20} />
            </button>
          </div>
        </UCard>
        <UButton size="lg" full onClick={() => navigate({ to: "/app" })}>
          Continue to Umeed
        </UButton>
      </Screen>
    </>
  );
}
