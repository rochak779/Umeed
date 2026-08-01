import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { useEffect } from "react";
import { useUmeed } from "@/state/UmeedProvider";

export function PushNotification() {
  const { push, dismissPush } = useUmeed();

  useEffect(() => {
    if (!push) return;
    const t = setTimeout(dismissPush, 5000);
    return () => clearTimeout(t);
  }, [push, dismissPush]);

  return (
    <AnimatePresence>
      {push ? (
        <motion.div
          key={push.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto absolute inset-x-4 top-4 z-50"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 rounded-[0.875rem] border border-line bg-surface/98 p-4 shadow-calm backdrop-blur">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-tint text-sage">
              <BellRing size={16} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-caption font-semibold uppercase tracking-wide text-sage">Umeed</p>
              <p className="t-body font-medium text-text">{push.title}</p>
              <p className="t-caption text-text-soft">{push.body}</p>
            </div>
            <button
              onClick={dismissPush}
              aria-label="Dismiss notification"
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-text-soft"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
