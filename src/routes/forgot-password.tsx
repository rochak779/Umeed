import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MailQuestion } from "lucide-react";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — Umeed" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await container.authProvider.requestPasswordReset(email);
    setSent(true); // Always shown, whether or not the email exists — never confirm which.
  };

  if (sent) {
    return (
      <>
        <TopBar title="Check your email" back="/sign-in" />
        <Screen>
          <UCard className="flex flex-col items-center gap-3 py-8 text-center">
            <MailQuestion className="text-sage" size={32} aria-hidden />
            <p className="t-body text-text-soft">
              If an account exists for {email}, we've sent a link to reset your password.
            </p>
          </UCard>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Forgot your password?" back="/sign-in" />
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
              hint="We'll send you a link to reset your password."
            />
            <UButton type="submit" size="lg" full>
              Send reset link
            </UButton>
          </form>
        </UCard>
      </Screen>
    </>
  );
}
