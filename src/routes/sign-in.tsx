import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { redirectIfAuthenticated } from "@/features/authentication/guards";
import { useSession } from "@/features/authentication/SessionContext";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: redirectIfAuthenticated,
  head: () => ({ meta: [{ title: "Sign in — Umeed" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await container.authProvider.signIn({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError("Email or password is incorrect.");
      return;
    }
    await refresh();
    navigate({ to: "/app" });
  };

  return (
    <>
      <TopBar title="Sign in" back="/" />
      <Screen>
        <UCard>
          <form className="space-y-4" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
            />
            <UButton type="submit" size="lg" full disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </UButton>
          </form>
        </UCard>
        <p className="t-body text-center text-text-soft">
          <Link to="/forgot-password" className="font-medium text-trust">
            Forgot your password?
          </Link>
        </p>
        <p className="t-body text-center text-text-soft">
          New to Umeed?{" "}
          <Link to="/sign-up" className="font-medium text-trust">
            Create an account
          </Link>
        </p>
      </Screen>
    </>
  );
}
