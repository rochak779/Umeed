import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, UserPlus } from "lucide-react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { useSession } from "@/features/authentication/SessionContext";
import {
  previewInvitation,
  type PreviewInvitationResult,
} from "@/application/use-cases/previewInvitation";
import { acceptInvitation } from "@/application/use-cases/acceptInvitation";
import { registerAccount } from "@/application/use-cases/registerAccount";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "You've been invited — Umeed" }] }),
  component: InviteAccept,
});

const responderLabel: Record<string, string> = {
  older_adult: "the person being supported",
  family: "a family member",
  nearby_responder: "a trusted nearby responder",
  coordinator: "a coordinator",
};

const rejectionMessage: Record<string, string> = {
  invalid_token: "This invitation link isn't valid.",
  expired: "This invitation has expired. Ask them to send a new one.",
  revoked: "This invitation has been withdrawn.",
  already_used: "This invitation has already been used.",
};

function InviteAccept() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { session, refresh } = useSession();
  const [preview, setPreview] = useState<PreviewInvitationResult | null>(null);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void previewInvitation(
      {
        careCircleRepository: container.careCircleRepository,
        invitationRepository: container.invitationRepository,
        profileRepository: container.profileRepository,
        clock: container.clock,
      },
      { token },
    ).then(setPreview);
  }, [token]);

  const finishAcceptance = async (userId: string, userEmail: string) => {
    const result = await acceptInvitation(
      {
        careCircleRepository: container.careCircleRepository,
        invitationRepository: container.invitationRepository,
        consentRepository: container.consentRepository,
        auditRepository: container.auditRepository,
        clock: container.clock,
        idGenerator: container.idGenerator,
      },
      { token, userId, userEmail },
    );
    if (!result.ok) {
      setError(
        result.code === "wrong_account"
          ? "This invitation was addressed to another email address."
          : (rejectionMessage[result.code] ?? "Something went wrong."),
      );
      return;
    }
    await refresh();
    navigate({ to: "/app" });
  };

  const onAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "sign-up") {
      const result = await registerAccount(
        {
          authProvider: container.authProvider,
          profileRepository: container.profileRepository,
          clock: container.clock,
        },
        { displayName, email, password },
      );
      if (!result.ok) {
        setError(
          result.code === "email_taken"
            ? "An account with this email already exists."
            : "Something went wrong.",
        );
        return;
      }
      await finishAcceptance(result.session.userId, result.session.email);
    } else {
      const result = await container.authProvider.signIn({ email, password });
      if (!result.ok) {
        setError("Email or password is incorrect.");
        return;
      }
      await finishAcceptance(result.session.userId, result.session.email);
    }
  };

  if (!preview) {
    return (
      <>
        <TopBar title="Invitation" back="/" />
        <Screen>
          <p className="t-body text-text-soft">Checking your invitation…</p>
        </Screen>
      </>
    );
  }

  if (!preview.ok) {
    return (
      <>
        <TopBar title="Invitation" back="/" />
        <Screen>
          <UCard className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="text-marigold" size={32} aria-hidden />
            <p className="t-body text-text-soft">{rejectionMessage[preview.code]}</p>
            <UButton onClick={() => navigate({ to: "/" })}>Go to Umeed</UButton>
          </UCard>
        </Screen>
      </>
    );
  }

  // Already signed in: accept directly instead of asking them to authenticate again.
  if (session) {
    return (
      <>
        <TopBar title="You've been invited" back="/" />
        <Screen>
          <UCard className="space-y-3">
            <p className="t-body text-text">
              <strong>{preview.inviterName}</strong> has invited you to join{" "}
              <strong>{preview.circleName}</strong> as{" "}
              {responderLabel[preview.proposedResponderType]}.
            </p>
            {error ? <p className="t-caption text-critical">{error}</p> : null}
            <UButton size="lg" full onClick={() => finishAcceptance(session.userId, session.email)}>
              Accept invitation
            </UButton>
          </UCard>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="You've been invited" back="/" />
      <Screen>
        <UCard className="space-y-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
            <UserPlus aria-hidden size={22} />
          </span>
          <p className="t-body text-text">
            <strong>{preview.inviterName}</strong> has invited you to join{" "}
            <strong>{preview.circleName}</strong> as {responderLabel[preview.proposedResponderType]}
            .
          </p>
          <p className="t-caption text-text-soft">
            Sign in or create an account to review what you'll be able to see before you accept.
          </p>
        </UCard>

        <UCard>
          <form className="space-y-4" onSubmit={onAuthSubmit}>
            {mode === "sign-up" ? (
              <Field
                id="displayName"
                label="Your name"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            ) : null}
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint={
                preview.invitedEmail
                  ? `Use ${preview.invitedEmail} to accept this invitation.`
                  : undefined
              }
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
            />
            <UButton type="submit" size="lg" full>
              {mode === "sign-up" ? "Create account and accept" : "Sign in and accept"}
            </UButton>
          </form>
        </UCard>

        <p className="t-body text-center text-text-soft">
          {mode === "sign-up" ? (
            <>
              Already have an account?{" "}
              <button className="font-medium text-trust" onClick={() => setMode("sign-in")}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button className="font-medium text-trust" onClick={() => setMode("sign-up")}>
                Create an account
              </button>
            </>
          )}
        </p>
      </Screen>
    </>
  );
}
