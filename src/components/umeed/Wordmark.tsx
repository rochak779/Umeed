import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Tapping the wordmark five times opens the presenter panel. */
export function Wordmark({
  size = "lg",
  className,
}: {
  size?: "sm" | "lg" | "xl" | undefined;
  className?: string | undefined;
}) {
  const navigate = useNavigate();
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTap = () => {
    taps.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => (taps.current = 0), 1200);
    if (taps.current >= 5) {
      taps.current = 0;
      navigate({ to: "/demo" });
    }
  };

  const sizes = {
    sm: "text-[1.25rem]",
    lg: "text-[2rem]",
    xl: "text-[2.5rem]",
  };

  return (
    <button
      onClick={onTap}
      aria-label="Umeed"
      className={cn(
        "inline-flex min-h-12 items-center gap-2 font-bold tracking-tight text-sage",
        sizes[size],
        className,
      )}
    >
      <span aria-hidden className="relative inline-flex items-center">
        <span className="size-2.5 rounded-full bg-sage" />
        <span className="ml-0.5 size-1.5 rounded-full bg-marigold" />
      </span>
      Umeed
    </button>
  );
}
