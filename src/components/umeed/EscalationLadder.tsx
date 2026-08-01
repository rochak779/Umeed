import { motion } from "framer-motion";
import { BellRing, Bell, HeartHandshake, Users, Zap } from "lucide-react";
import { LADDER_STEPS } from "@/state/escalation";
import { cn } from "@/lib/utils";

const icons = [Bell, BellRing, HeartHandshake, Users];

export function EscalationLadder({
  activeIndex = -1,
  showSos = true,
  compact = false,
}: {
  activeIndex?: number | undefined;
  showSos?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  return (
    <div className="card-calm relative overflow-hidden p-4">
      <p className="t-card-title font-semibold text-text">How we reach people</p>
      <p className="t-caption mt-1 text-text-soft">
        Silence is the signal. Each step only happens if the one before it goes unanswered.
      </p>

      <div className="relative mt-6 pl-1">
        {/* the vertical spine */}
        <span
          aria-hidden
          className="absolute left-[1.375rem] top-3 bottom-8 w-[2px] rounded bg-sage-tint"
        />
        <motion.span
          aria-hidden
          className="absolute left-[1.375rem] top-3 w-[2px] origin-top rounded bg-sage"
          initial={{ scaleY: 0 }}
          animate={{
            scaleY: activeIndex < 0 ? 0 : (activeIndex + 1) / LADDER_STEPS.length,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ bottom: "2rem" }}
        />

        <ol className="relative space-y-5">
          {LADDER_STEPS.map((step, i) => {
            const Icon = icons[i]!;
            const reached = i <= activeIndex;
            const isActive = i === activeIndex;
            return (
              <li key={step.key} className="flex gap-4">
                <span className="relative">
                  {isActive ? (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-sage/25"
                      initial={{ scale: 0.9, opacity: 0.7 }}
                      animate={{ scale: 1.35, opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative flex size-11 items-center justify-center rounded-full border-2 transition-colors duration-300",
                      reached
                        ? "border-sage bg-sage text-white"
                        : "border-sage-tint bg-surface text-sage",
                    )}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                </span>
                <div className="pt-1">
                  <p className="t-body font-medium text-text">
                    {i + 1}. {step.title}
                    {isActive ? (
                      <span className="t-caption ml-2 rounded-full bg-sage-tint px-2 py-0.5 text-sage">
                        happening now
                      </span>
                    ) : null}
                  </p>
                  {!compact ? (
                    <p className="t-caption mt-0.5 text-text-soft">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {showSos ? (
          <div className="mt-6 flex gap-4 border-t border-line pt-4">
            <span className="flex size-11 items-center justify-center rounded-full border-2 border-critical/40 bg-critical/10 text-critical">
              <Zap size={18} aria-hidden />
            </span>
            <div className="pt-1">
              <p className="t-body font-medium text-text">Help button</p>
              <p className="t-caption mt-0.5 text-text-soft">
                Skips every step. Sunita and you are told in the same moment.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
