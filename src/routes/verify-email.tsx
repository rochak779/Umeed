import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { container } from "@/features/authentication/container";
import { requireSession } from "@/features/authentication/guards";
import { useSession } from "@/features/authentication/SessionContext";

export const Route = createFileRoute("/verify-email")({
  beforeLoad: requireSession,
  head: () => ({ meta: [{ title: "Verify your email — Umeed" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const navigate = useNavigate();
  const { session, refresh } = useSession();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    void container.authProvider.isEmailVerified(session.userId).then(setVerified);
  }, [session]);

  if (verified) {
    return (
      <>
        <TopBar title="Email verified" />
        <Screen>
          <UCard className="flex flex-col items-center gap-3 py-8 text-center">
            <MailCheck className="text-sage" size={32} aria-hidden />
            <p className="t-body text-text-soft">Your email is verified.</p>
            <UButton size="lg" full={false} onClick={() => navigate({ to: "/app" })}>
              Continue
            </UButton>
          </UCard>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Check your email" />
      <Screen>
        <UCard className="flex flex-col items-center gap-3 py-8 text-center">
          <MailCheck className="text-sage" size={32} aria-hidden />
          <p className="t-body text-text-soft">
            We've sent a verification link to {session?.email}. Open it to confirm your email.
          </p>
          <p className="t-caption text-text-soft">
            You can keep using Umeed while it's pending — some actions may ask you to verify first.
          </p>
          <UButton
            variant="secondary"
            onClick={async () => {
              toast.success("Verification email re-sent (simulated in local development)");
              await refresh();
            }}
          >
            Resend email
          </UButton>
          <UButton variant="ghost" onClick={() => navigate({ to: "/app" })}>
            Continue to Umeed
          </UButton>
        </UCard>
      </Screen>
    </>
  );
}
