import { BatteryFull, Signal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * iPhone-style status bar. Sits above the app content inside the device screen.
 * Time is only rendered after hydration so SSR and client markup agree.
 */
export function StatusBar({ persona }: { persona: "child" | "parent" }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  const big = persona === "parent";

  return (
    <div
      aria-hidden
      className={cn(
        "relative z-30 flex shrink-0 items-center justify-between bg-bg px-7 text-text",
        big ? "h-14 pt-1" : "h-12",
      )}
    >
      <span className={cn("font-semibold tabular-nums", big ? "text-base" : "text-sm")}>
        {time ?? "\u00a0"}
      </span>
      {/* Dynamic Island */}
      <span className="pointer-events-none absolute left-1/2 top-2 hidden h-7 w-24 -translate-x-1/2 rounded-full bg-device sm:block" />
      <span className="flex items-center gap-1.5">
        <Signal size={big ? 18 : 15} />
        <Wifi size={big ? 18 : 15} />
        <BatteryFull size={big ? 22 : 18} />
      </span>
    </div>
  );
}

/** Home indicator bar at the bottom of the device screen. */
export function HomeIndicator() {
  return (
    <div aria-hidden className="flex h-6 shrink-0 items-end justify-center bg-bg pb-2">
      <span className="h-[5px] w-32 rounded-full bg-text/25" />
    </div>
  );
}
