import { describe, expect, it } from "vitest";

const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) && Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);

async function invoke(): Promise<{ occurrencesGenerated: number; alertsRaised: number; claimsReleased: number }> {
  const response = await fetch(`${process.env["SUPABASE_URL"]}/functions/v1/poll-due-work`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env["SUPABASE_SERVICE_ROLE_KEY"]}` },
  });
  if (!response.ok) throw new Error(`poll-due-work returned ${response.status}`);
  return response.json();
}

describe.skipIf(!hasSupabaseEnv)("poll-due-work Edge Function", () => {
  it("running twice back-to-back does not double-generate occurrences", async () => {
    const first = await invoke();
    const second = await invoke();
    // The second call sees the same due state the first call just resolved
    // — nothing new should be due a few hundred milliseconds later.
    expect(second.occurrencesGenerated).toBe(0);
    expect(second.alertsRaised).toBe(0);
    void first;
  });
});
