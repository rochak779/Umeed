import { useEffect } from "react";
import { getSupabaseAuthClient } from "@/infrastructure/supabase/authClient";

/**
 * Subscribes to live changes on `alerts` for one care circle (Implementation.md
 * §11.1 EventBus / Phase 10 design doc §4: Realtime scope is alerts only).
 * On any change, calls onChange so the caller re-fetches through its normal
 * use case — Realtime here is purely the "something changed, refetch"
 * signal, never a second source of truth for alert state. A no-op outside
 * Supabase mode, since the local adapter has no Realtime equivalent (its
 * screens already poll on their own effects).
 */
export function useAlertsRealtime(circleId: string | undefined, onChange: () => void): void {
  useEffect(() => {
    if (!circleId) return;
    if (process.env["DATA_ADAPTER"] !== "supabase") return;

    const client = getSupabaseAuthClient();
    const channel = client
      .channel(`alerts:${circleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `care_circle_id=eq.${circleId}` },
        () => onChange(),
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);
}
