import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Home,
  Leaf,
  Minus,
  Users,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { StatusKind } from "@/data/seed";
import { cn } from "@/lib/utils";

/* ---------------- UButton ---------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg" | "xl";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-sage text-white border border-sage shadow-calm active:bg-sage-dark",
  secondary: "bg-surface text-trust border-2 border-trust active:bg-trust-tint",
  ghost: "bg-transparent text-text-soft border border-transparent active:bg-container",
  danger: "bg-critical-tint text-critical border border-critical/25 active:bg-critical/20",
};

const sizeClass: Record<ButtonSize, string> = {
  md: "min-h-12 px-5",
  lg: "min-h-14 px-6",
  xl: "min-h-16 px-6",
};


export function UButton({
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  full?: boolean | undefined;
} & Omit<ComponentProps<"button">, "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart" | "style">) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        "t-button inline-flex items-center justify-center gap-2 rounded-[0.875rem] transition-colors",
        variantClass[variant],
        sizeClass[size],
        full && "w-full",
        rest.disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ---------------- UCard ---------------- */

export function UCard({
  className,
  children,
  as: As = "div",
  ...rest
}: { as?: "div" | "section" | "li" | "article" | undefined } & ComponentProps<"div">) {
  const Tag = As as "div";
  return (
    <Tag className={cn("card-calm p-4", className)} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------------- StatusPill ---------------- */

const statusMap: Record<
  StatusKind,
  { word: string; icon: typeof Leaf; fg: string; bg: string; border: string }
> = {
  steady: {
    word: "Steady",
    icon: Leaf,
    fg: "text-sage",
    bg: "bg-sage-tint",
    border: "border-sage/30",
  },
  watch: {
    word: "Watch",
    icon: Eye,
    fg: "text-marigold",
    bg: "bg-marigold/10",
    border: "border-marigold/40",
  },
  attention: {
    word: "Needs attention",
    icon: AlertTriangle,
    fg: "text-critical",
    bg: "bg-critical/10",
    border: "border-critical/40",
  },
};

export function StatusPill({ status, className }: { status: StatusKind; className?: string }) {
  const s = statusMap[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "t-caption inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-300",
        s.fg,
        s.bg,
        s.border,
        className,
      )}
    >
      <Icon size={14} aria-hidden />
      {s.word}
    </span>
  );
}

/* ---------------- SectionHeader ---------------- */

export function SectionHeader({
  title,
  action,
  hint,
}: {
  title: string;
  action?: ReactNode | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="t-section text-text">{title}</h2>
        {hint ? <p className="t-caption text-text-soft">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({
  icon: Icon = Leaf,
  line,
  action,
}: {
  icon?: typeof Leaf | undefined;
  line: string;
  action?: ReactNode | undefined;
}) {
  return (
    <UCard className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-sage-tint text-sage">
        <Icon size={22} aria-hidden />
      </span>
      <p className="t-body max-w-[16rem] text-text-soft">{line}</p>
      {action}
    </UCard>
  );
}

/* ---------------- TopBar ---------------- */

export function TopBar({
  title,
  subtitle,
  back,
  right,
  h1 = true,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: string | undefined;
  right?: ReactNode | undefined;
  h1?: boolean | undefined;
}) {
  const Heading = h1 ? "h1" : "p";
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      {back ? (
        <Link
          to={back}
          aria-label="Go back"
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-text"
        >
          <ArrowLeft size={22} aria-hidden />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <Heading className="t-card-title font-semibold text-text">{title}</Heading>
        {subtitle ? <p className="t-caption text-text-soft">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

/* ---------------- Avatar ---------------- */

export function Avatar({
  initials,
  size = 40,
  tone = "sage",
}: {
  initials: string;
  size?: number | undefined;
  tone?: "sage" | "trust" | "marigold" | undefined;
}) {
  const tones = {
    sage: "bg-sage-tint text-sage",
    trust: "bg-trust/10 text-trust",
    marigold: "bg-marigold/15 text-marigold",
  };
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tones[tone],
      )}
    >
      {initials}
    </span>
  );
}

/* ---------------- BottomNav ---------------- */

const navItems = [
  { to: "/child/home", label: "Home", icon: Home },
  { to: "/child/parent/anuradha", label: "Parents", icon: UserRound },
  { to: "/child/documents", label: "Documents", icon: FileText },
  { to: "/child/family", label: "Family", icon: Users },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 border-t border-line bg-surface/95 px-2 pb-2 pt-1 backdrop-blur"
    >
      <ul className="flex items-stretch justify-between">
        {navItems.map((item) => {
          const active =
            item.to === "/child/home"
              ? path === item.to
              : path.startsWith(item.to.split("/").slice(0, 3).join("/"));
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[0.875rem] px-2 py-1.5",
                  active ? "text-sage" : "text-text-soft",
                )}
              >
                <Icon size={22} aria-hidden />
                <span className="t-caption">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------------- Sparkline ---------------- */

export function Sparkline({
  values,
  tone = "sage",
  width = 72,
  height = 28,
  label,
}: {
  values: number[];
  tone?: "sage" | "marigold" | undefined;
  width?: number | undefined;
  height?: number | undefined;
  label: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((v - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label={label}>
      <polyline
        points={points}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        stroke={tone === "sage" ? "var(--sage)" : "var(--marigold)"}
      />
    </svg>
  );
}

/* ---------------- DotStrip ---------------- */

export function DotStrip({
  days,
  label,
}: {
  days: ("done" | "missed" | "upcoming")[];
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={label}>
      {days.map((d, i) => (
        <span
          key={i}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border",
            d === "done" && "border-sage bg-sage-tint text-sage",
            d === "missed" && "border-marigold bg-marigold/10 text-marigold",
            d === "upcoming" && "border-line bg-bg text-text-soft",
          )}
        >
          {d === "done" ? <CheckCircle2 size={13} aria-hidden /> : null}
          {d === "missed" ? <Minus size={13} aria-hidden /> : null}
        </span>
      ))}
    </div>
  );
}

/* ---------------- WhyPanel (mandatory on every insight) ---------------- */

export function WhyPanel({ lines }: { lines: string[] }) {
  return (
    <details className="mt-4 rounded-[0.875rem] border border-line bg-bg px-4 py-3">
      <summary className="t-body flex min-h-12 cursor-pointer list-none items-center justify-between font-medium text-trust">
        Why we are saying this
        <span aria-hidden className="t-caption text-text-soft">
          open
        </span>
      </summary>
      <ul className="mt-3 space-y-2">
        {lines.map((l) => (
          <li key={l} className="t-body flex gap-2 text-text">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sage" />
            {l}
          </li>
        ))}
      </ul>
      <p className="t-caption mt-3 border-t border-line pt-3 text-text-soft">
        Umeed does not diagnose. It notices patterns and tells you why.
      </p>
    </details>
  );
}

/* ---------------- Screen scaffolding ---------------- */

export function Screen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <main className={cn("flex-1 px-4 py-4", className)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="space-y-4"
      >
        {children}
      </motion.div>
    </main>
  );
}
