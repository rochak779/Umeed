import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { useSession } from "@/features/authentication/SessionContext";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().min(1) }),
  head: () => ({ meta: [{ title: "Reset your password — Umeed" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await container.authProvider.resetPassword({ token, newPassword });
    if (!result.ok) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    await refresh();
    navigate({ to: "/app" });
  };

  return (
    <>
      <TopBar title="Choose a new password" back="/sign-in" />
      <Screen>
        <UCard>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field
              id="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={error ?? undefined}
            />
            <UButton type="submit" size="lg" full>
              Set new password
            </UButton>
          </form>
        </UCard>
      </Screen>
    </>
  );
}
