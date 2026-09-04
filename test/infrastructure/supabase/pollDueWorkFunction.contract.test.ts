import { describe, expect, it } from "vitest";

const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) &&
  Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]) &&
  Boolean(process.env["POLL_DUE_WORK_INVOKE_SECRET"]);

async function invoke(): Promise<{ occurrencesGenerated: number; alertsRaised: number; claimsReleased: number }> {
  const response = await fetch(`${process.env["SUPABASE_URL"]}/functions/v1/poll-due-work`, {
    method: "POST",
    // The function checks POLL_DUE_WORK_INVOKE_SECRET, a deliberately separate
    // secret from SUPABASE_SERVICE_ROLE_KEY (see the doc comment in
    // supabase/functions/poll-due-work/index.ts) — sending the service-role
    // key here would 401 against a correctly configured deployment.
    headers: { Authorization: `Bearer ${process.env["POLL_DUE_WORK_INVOKE_SECRET"]}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`poll-due-work returned ${response.status}: ${body}`);
  }
  return response.json();
}

describe.skipIf(!hasSupabaseEnv)("poll-due-work Edge Function", () => {
  it(
    "running twice back-to-back does not double-generate occurrences",
    async () => {
      const first = await invoke();
      const second = await invoke();
      // The second call sees the same due state the first call just resolved
      // — nothing new should be due a few hundred milliseconds later.
      expect(second.occurrencesGenerated).toBe(0);
      expect(second.alertsRaised).toBe(0);
      void first;
    },
    // Two sequential live HTTPS round-trips to a deployed Edge Function
    // (auth check, Supabase client construction, a full pollDueWork pass
    // over every active circle) — vitest's 5s default isn't enough
    // headroom, especially on a cold invocation. 30s is generous without
    // letting a genuine hang go unnoticed.
    30_000,
  );
});
