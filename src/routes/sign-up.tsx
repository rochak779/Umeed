import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { api } from "@/features/authentication/sessionApi";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await api.session.register({ displayName, email, password });
    setSubmitting(false);
    if (!result.ok && result.code === "confirmation_required") {
      setNotice(`We've sent a confirmation link to ${email}. Open it, then sign in.`);
      return;
    }
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
        <p className="t-caption text-text-soft">
          Prototype: use made-up details, not real people or medical information.
        </p>
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
            {notice && (
              <p className="t-body text-text-soft" role="status">
                {notice}
              </p>
            )}
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
