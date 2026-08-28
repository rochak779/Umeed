import { cn } from "@/lib/utils";

export function Wordmark({
  size = "lg",
  className,
}: {
  size?: "sm" | "lg" | "xl" | undefined;
  className?: string | undefined;
}) {
  const sizes = {
    sm: "text-[1.25rem]",
    lg: "text-[2rem]",
    xl: "text-[2.5rem]",
  };

  return (
    <span
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
    </span>
  );
}
