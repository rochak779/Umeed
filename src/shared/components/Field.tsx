import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** The one shared input style (design.md flags three near-duplicate copies of this — consolidating here). */
export const inputCx =
  "t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3 text-text placeholder:text-text-soft focus:border-sage focus:outline-none";

export function Field({
  label,
  hint,
  error,
  id,
  className,
  ...rest
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  id: string;
  className?: string | undefined;
} & Omit<ComponentProps<"input">, "id">) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="t-body block font-medium text-text">
        {label}
      </label>
      <input id={id} className={cn(inputCx, error && "border-critical", className)} {...rest} />
      {hint && !error ? <p className="t-caption text-text-soft">{hint}</p> : null}
      {error ? (
        <p role="alert" className="t-caption text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
