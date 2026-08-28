import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { registerAccount } from "@/application/use-cases/registerAccount";
import { container } from "@/features/authentication/container";
import { redirectIfAuthenticated } from "@/features/authentication/guards";
import { useSession } from "@/features/authentication/SessionContext";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: redirectIfAuthenticated,
  head: () => ({ meta: [{ title: "Create your account — Umeed" }] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await registerAccount(
      {
        authProvider: container.authProvider,
        profileRepository: container.profileRepository,
        clock: container.clock,
      },
      { displayName, email, password },
    );
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.code === "email_taken"
          ? "An account with this email already exists."
          : "Something went wrong. Please try again.",
      );
      return;
    }
    await refresh();
    navigate({ to: "/verify-email" });
  };

  return (
    <>
      <TopBar title="Create your account" back="/" />
      <Screen>
        <UCard>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field
              id="displayName"
              label="Your name"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 8 characters."
              error={error ?? undefined}
            />
            <UButton type="submit" size="lg" full disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </UButton>
          </form>
        </UCard>
        <p className="t-body text-center text-text-soft">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-medium text-trust">
            Sign in
          </Link>
        </p>
      </Screen>
    </>
  );
}
