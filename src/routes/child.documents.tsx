import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Copy,
  FileText,
  Plus,
  Sparkles,
  Upload,
  MessageCircle,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  Screen,
  TopBar,
  UButton,
  UCard,
} from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import type { Doc } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Umeed" },
      {
        name: "description",
        content:
          "Prescriptions, lab reports and pharmacy bills, filed by Umeed the moment they arrive.",
      },
      { property: "og:title", content: "Documents — Umeed" },
      {
        property: "og:description",
        content: "Forward a prescription on WhatsApp and it files itself.",
      },
    ],
  }),
  component: Documents,
});

const TYPES = ["All types", "Prescription", "Lipid profile", "HbA1c report", "Pharmacy bill"];

function Documents() {
  const { data, addDocument } = useUmeed();
  const [who, setWho] = useState("all");
  const [type, setType] = useState("All types");
  const [open, setOpen] = useState<Doc | null>(null);
  const [sheet, setSheet] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);

  const docs = useMemo(
    () =>
      data.documents.filter(
        (d) =>
          (who === "all" || d.parentId === who) &&
          (type === "All types" || d.type === type),
      ),
    [data.documents, who, type],
  );

  const chips = [
    { id: "all", label: "All" },
    { id: "anuradha", label: "Mummy" },
    { id: "manoj", label: "Papa" },
  ];

  return (
    <>
      <TopBar title="Documents" subtitle="Everything Umeed has filed for your parents" />
      <Screen className="relative">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setWho(c.id)}
              aria-pressed={who === c.id}
              className={cn(
                "t-caption min-h-12 rounded-full border px-4",
                who === c.id
                  ? "border-sage bg-sage-tint text-sage"
                  : "border-line bg-surface text-text",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "t-caption min-h-12 rounded-full border px-4",
                type === t
                  ? "border-sage bg-sage-tint text-sage"
                  : "border-line bg-surface text-text-soft",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            line="Nothing here yet. Forward a prescription on WhatsApp and it files itself."
            action={
              <UButton variant="secondary" onClick={() => setWhatsapp(true)}>
                <MessageCircle size={18} aria-hidden /> Show the WhatsApp number
              </UButton>
            }
          />
        ) : (
          <ul className="space-y-3">
            {docs.map((d) => {
              const person = data.family.find((p) => p.id === d.parentId);
              return (
                <li key={d.id}>
                  <button
                    onClick={() => setOpen(d)}
                    className="card-calm flex w-full items-start gap-3 p-4 text-left"
                  >
                    <span
                      aria-hidden
                      className="flex h-16 w-12 shrink-0 items-center justify-center rounded-[0.5rem] border border-line bg-sage-tint text-sage"
                    >
                      <FileText size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-card-title block font-medium text-text">
                        {d.title}
                      </span>
                      <span className="t-caption block text-text-soft">
                        {person?.shortName} · {d.date} · {d.type}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="t-caption rounded-full border border-line bg-bg px-2 py-0.5 text-text-soft">
                          {d.source}
                        </span>
                        <span className="t-caption inline-flex items-center gap-1 rounded-full border border-sage/30 bg-sage-tint px-2 py-0.5 text-sage">
                          <Sparkles size={12} aria-hidden /> Auto filed by Umeed
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="h-16" />
      </Screen>

      <button
        onClick={() => setSheet(true)}
        aria-label="Add a document"
        className="absolute bottom-24 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-sage text-white shadow-calm"
      >
        <Plus size={24} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="absolute inset-0 z-40 flex items-end bg-text/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label={open.title}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="max-h-[85%] w-full overflow-y-auto rounded-t-[1rem] bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="t-section text-text">{open.title}</h2>
                  <p className="t-caption text-text-soft">
                    {open.date} · came in on {open.source}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-text-soft"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <dl className="mt-4 divide-y divide-line">
                {open.fields.map((f, i) => (
                  <div key={i} className="flex gap-4 py-3">
                    <dt className="t-caption w-32 shrink-0 text-text-soft">{f.label}</dt>
                    <dd className="t-body text-text">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={() => toast.success("Thank you, we will look at this again")}
                className="t-caption mt-2 min-h-12 text-trust underline"
              >
                Something wrong here?
              </button>
            </motion.div>
          </motion.div>
        ) : null}

        {sheet ? (
          <motion.div
            className="absolute inset-0 z-40 flex items-end bg-text/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Add a document"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="w-full rounded-t-[1rem] bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="t-section text-text">Add a document</h2>
                <button
                  onClick={() => {
                    setSheet(false);
                    setWhatsapp(false);
                  }}
                  aria-label="Close"
                  className="flex size-12 items-center justify-center rounded-full text-text-soft"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>

              {whatsapp ? (
                <div className="mt-4">
                  <p className="t-body text-text">
                    Forward anything to this number and Umeed files it under the right parent.
                  </p>
                  <div className="mt-3 flex items-center gap-3 rounded-[0.875rem] border border-line bg-bg p-4">
                    <p className="t-card-title flex-1 font-semibold text-text">
                      +91 98765 43210
                    </p>
                    <UButton
                      variant="secondary"
                      onClick={() => toast.success("Number copied")}
                    >
                      <Copy size={18} aria-hidden /> Copy
                    </UButton>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <UButton
                    variant="secondary"
                    size="lg"
                    full
                    onClick={() => {
                      addDocument({
                        parentId: "anuradha",
                        title: "Prescription — Dr Mehta",
                        date: "28 July",
                        type: "Prescription",
                        source: "Camera",
                        fields: [
                          { label: "Doctor", value: "Dr S. Mehta" },
                          { label: "Medicine", value: "Telmisartan 40 mg, morning" },
                          { label: "Medicine", value: "Calcium + D3, night" },
                        ],
                      });
                      setSheet(false);
                      toast.success("Filed under Mummy's prescriptions");
                    }}
                  >
                    <Camera size={18} aria-hidden /> Take a photo
                  </UButton>
                  <UButton
                    variant="secondary"
                    size="lg"
                    full
                    onClick={() => {
                      addDocument({
                        parentId: "manoj",
                        title: "Sugar log — July",
                        date: "30 July",
                        type: "Pharmacy bill",
                        source: "Gmail",
                        fields: [
                          { label: "Shop", value: "Apollo Pharmacy" },
                          { label: "Items", value: "Metformin 500 mg × 60" },
                          { label: "Amount", value: "₹ 190" },
                        ],
                      });
                      setSheet(false);
                      toast.success("Filed under Papa's reports");
                    }}
                  >
                    <Upload size={18} aria-hidden /> Upload from device
                  </UButton>
                  <UButton
                    variant="secondary"
                    size="lg"
                    full
                    onClick={() => setWhatsapp(true)}
                  >
                    <MessageCircle size={18} aria-hidden /> Forward on WhatsApp
                  </UButton>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
