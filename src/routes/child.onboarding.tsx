import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock,
  HeartHandshake,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EscalationLadder } from "@/components/umeed/EscalationLadder";
import { Wordmark } from "@/components/umeed/Wordmark";
import { UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your family — Umeed" },
      {
        name: "description",
        content:
          "Six calm steps: your number, your parents, your family, and someone close by who can look in.",
      },
      { property: "og:title", content: "Set up your family — Umeed" },
      {
        property: "og:description",
        content: "Add your parents and one trusted neighbour in a few minutes.",
      },
    ],
  }),
  component: Onboarding,
});

const LANGUAGES = ["English", "हिन्दी", "मराठी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "বাংলা"];
const CODES = ["+91", "+1", "+44", "+971", "+65"];

type ParentDraft = {
  name: string;
  relationship: string;
  age: string;
  phone: string;
  email: string;
  language: string;
  verified: boolean;
};

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="t-caption mb-1 block font-medium text-text">{label}</span>
      {children}
      {error ? (
        <span className="t-caption mt-1 block text-critical">{error}</span>
      ) : hint ? (
        <span className="t-caption mt-1 block text-text-soft">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCx =
  "t-body min-h-12 w-full rounded-[0.75rem] border border-line bg-surface px-3 text-text placeholder:text-text-soft focus:border-sage";

function OtpBoxes({
  onDone,
  autoFill,
}: {
  onDone: (code: string) => void;
  autoFill?: boolean | undefined;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!autoFill) return;
    let i = 0;
    const code = "123456";
    const t = setInterval(() => {
      setDigits((d) => {
        const next = [...d];
        next[i] = code[i]!;
        return next;
      });
      i += 1;
      if (i === 6) {
        clearInterval(t);
        setTimeout(() => onDone(code), 400);
      }
    }, 380);
    return () => clearInterval(t);
  }, [autoFill, onDone]);

  const set = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d)) onDone(next.join(""));
  };

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          inputMode="numeric"
          aria-label={`Digit ${i + 1} of 6`}
          className="t-title size-12 rounded-[0.75rem] border border-line bg-surface text-center font-semibold text-text focus:border-sage"
        />
      ))}
    </div>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { setOnboardingDone, setPersona } = useUmeed();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [parents, setParents] = useState<ParentDraft[]>([
    {
      name: "Anuradha Rao",
      relationship: "Mother",
      age: "68",
      phone: "9928041172",
      email: "",
      language: "हिन्दी",
      verified: false,
    },
    {
      name: "Manoj Rao",
      relationship: "Father",
      age: "72",
      phone: "9928041180",
      email: "",
      language: "हिन्दी",
      verified: false,
    },
  ]);
  const [verifyIndex, setVerifyIndex] = useState<number | null>(null);
  const [siblings, setSiblings] = useState([{ name: "Rohan Rao", phone: "9822055019" }]);
  const [helper, setHelper] = useState({
    name: "Sunita Sharma",
    relationship: "Neighbour",
    phone: "9414077321",
    distance: "200 metres",
  });

  const total = 6;

  const goNext = () => setStep((s) => Math.min(total, s + 1));
  const goBack = () => {
    if (otpStage) {
      setOtpStage(false);
      return;
    }
    if (step === 1) {
      navigate({ to: "/" });
      return;
    }
    setStep((s) => s - 1);
  };

  const submitPhone = () => {
    if (phone.replace(/\D/g, "").length !== 10) {
      setPhoneError("That number needs 10 digits");
      return;
    }
    setPhoneError("");
    setOtpStage(true);
  };

  const finish = () => {
    setOnboardingDone(true);
    setPersona("child");
    navigate({ to: "/child/home" });
  };

  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          aria-label={step === 1 && !otpStage ? "Back to who is using this" : "Go back"}
          className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-text"
        >
          <ArrowLeft size={22} aria-hidden />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-tint">
          <motion.div
            className="h-full rounded-full bg-sage"
            animate={{ width: `${(step / total) * 100}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
        <span className="t-caption w-12 text-right text-text-soft">
          {step} of {total}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${step}-${otpStage}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-1 flex-col pt-6"
        >
          {step === 1 ? (
            <div className="flex flex-1 flex-col">
              <Wordmark size="xl" />
              <h1 className="t-title mt-6 text-text">Someone is always close by.</h1>
              <p className="t-body mt-3 text-text-soft">
                Know how your parents really are, without asking them to prove it.
              </p>
              <div className="mt-8">
                <EscalationLadder activeIndex={-1} compact />
              </div>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={goNext}>
                  Get started
                </UButton>
              </div>
            </div>
          ) : null}

          {step === 2 && !otpStage ? (
            <div className="flex flex-1 flex-col">
              <h1 className="t-title text-text">Your number</h1>
              <p className="t-body mt-2 text-text-soft">
                We use it only to reach you when something needs you.
              </p>
              <div className="mt-6 flex gap-3">
                <label className="block">
                  <span className="t-caption mb-1 block font-medium text-text">Code</span>
                  <select
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(inputCx, "w-24")}
                  >
                    {CODES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="flex-1">
                  <Field label="Mobile number" error={phoneError}>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="numeric"
                      placeholder="98111 20034"
                      className={inputCx}
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={submitPhone}>
                  Send me a code
                </UButton>
              </div>
            </div>
          ) : null}

          {step === 2 && otpStage ? (
            <div className="flex flex-1 flex-col">
              <h1 className="t-title text-text">Enter the code</h1>
              <p className="t-body mt-2 text-text-soft">
                We sent it to {code} {phone}.
              </p>
              <div className="mt-8">
                <OtpBoxes onDone={() => setTimeout(() => { setOtpStage(false); goNext(); }, 300)} />
                <p className="t-caption mt-3 text-text-soft">Use 123456 for the demo.</p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-1 flex-col">
              <h1 className="t-title text-text">Add your parents</h1>
              <p className="t-body mt-2 text-text-soft">
                Up to two. Everything here can be changed later.
              </p>
              <div className="mt-6 space-y-4">
                {parents.map((p, i) => (
                  <UCard key={i} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="t-card-title font-semibold text-text">
                        {p.relationship || "Parent"}
                      </p>
                      {p.verified ? (
                        <span className="t-caption inline-flex items-center gap-1 rounded-full border border-sage/30 bg-sage-tint px-2.5 py-1 text-sage">
                          <BadgeCheck size={14} aria-hidden /> Verified
                        </span>
                      ) : (
                        <UButton variant="secondary" onClick={() => setVerifyIndex(i)}>
                          Verify
                        </UButton>
                      )}
                    </div>
                    <Field label="Name">
                      <input
                        value={p.name}
                        onChange={(e) =>
                          setParents((ps) =>
                            ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        className={inputCx}
                      />
                    </Field>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Field label="Relationship">
                          <select
                            value={p.relationship}
                            onChange={(e) =>
                              setParents((ps) =>
                                ps.map((x, j) =>
                                  j === i ? { ...x, relationship: e.target.value } : x,
                                ),
                              )
                            }
                            className={inputCx}
                          >
                            <option>Mother</option>
                            <option>Father</option>
                          </select>
                        </Field>
                      </div>
                      <div className="w-24">
                        <Field label="Age">
                          <input
                            value={p.age}
                            inputMode="numeric"
                            onChange={(e) =>
                              setParents((ps) =>
                                ps.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)),
                              )
                            }
                            className={inputCx}
                          />
                        </Field>
                      </div>
                    </div>
                    <Field label="WhatsApp number" hint="Alerts and reminders go here.">
                      <input
                        value={p.phone}
                        inputMode="numeric"
                        onChange={(e) =>
                          setParents((ps) =>
                            ps.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)),
                          )
                        }
                        className={inputCx}
                      />
                    </Field>
                    <Field label="Email, if you have it">
                      <input
                        value={p.email}
                        onChange={(e) =>
                          setParents((ps) =>
                            ps.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                          )
                        }
                        placeholder="Optional"
                        className={inputCx}
                      />
                    </Field>
                    <Field label="Language they read best">
                      <select
                        value={p.language}
                        onChange={(e) =>
                          setParents((ps) =>
                            ps.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)),
                          )
                        }
                        className={inputCx}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </Field>
                  </UCard>
                ))}
              </div>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={goNext}>
                  Continue
                </UButton>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-1 flex-col">
              <h1 className="t-title text-text">Add family</h1>
              <p className="t-body mt-2 text-text-soft">
                Brothers and sisters who should see the same things you do. They see everything
                you see.
              </p>
              <div className="mt-6 space-y-4">
                {siblings.map((s, i) => (
                  <UCard key={i} className="space-y-3">
                    <Field label="Name">
                      <input
                        value={s.name}
                        onChange={(e) =>
                          setSiblings((ss) =>
                            ss.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        className={inputCx}
                      />
                    </Field>
                    <Field label="Mobile number">
                      <input
                        value={s.phone}
                        inputMode="numeric"
                        onChange={(e) =>
                          setSiblings((ss) =>
                            ss.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)),
                          )
                        }
                        className={inputCx}
                      />
                    </Field>
                  </UCard>
                ))}
                <UButton
                  variant="secondary"
                  full
                  onClick={() => setSiblings((ss) => [...ss, { name: "", phone: "" }])}
                >
                  <Plus size={18} aria-hidden /> Add another
                </UButton>
              </div>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={goNext}>
                  Continue
                </UButton>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-1 flex-col">
              <span className="flex size-12 items-center justify-center rounded-full bg-sage-tint text-sage">
                <HeartHandshake size={24} aria-hidden />
              </span>
              <h1 className="t-title mt-4 text-text">Add someone nearby</h1>
              <p className="t-body mt-3 text-text">
                If your parents ever miss something important, we reach someone close by first.
                Not a call centre, and not you from three hours away.
              </p>
              <div className="mt-6 space-y-3">
                <Field label="Name">
                  <input
                    value={helper.name}
                    onChange={(e) => setHelper({ ...helper, name: e.target.value })}
                    className={inputCx}
                  />
                </Field>
                <Field label="How you know them">
                  <select
                    value={helper.relationship}
                    onChange={(e) => setHelper({ ...helper, relationship: e.target.value })}
                    className={inputCx}
                  >
                    <option>Neighbour</option>
                    <option>Relative</option>
                    <option>Family friend</option>
                  </select>
                </Field>
                <Field label="Mobile number">
                  <input
                    value={helper.phone}
                    inputMode="numeric"
                    onChange={(e) => setHelper({ ...helper, phone: e.target.value })}
                    className={inputCx}
                  />
                </Field>
                <Field
                  label="How far from your parents' home"
                  hint="Close enough to walk over in a few minutes is ideal."
                >
                  <input
                    value={helper.distance}
                    onChange={(e) => setHelper({ ...helper, distance: e.target.value })}
                    className={inputCx}
                  />
                </Field>
              </div>
              <div className="mt-6">
                <EscalationLadder activeIndex={-1} />
              </div>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={goNext}>
                  Continue
                </UButton>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="flex flex-1 flex-col">
              <span className="flex size-12 items-center justify-center rounded-full bg-sage-tint text-sage">
                <ShieldCheck size={24} aria-hidden />
              </span>
              <h1 className="t-title mt-4 text-text">You are set</h1>
              <p className="t-body mt-2 text-text-soft">
                Here is what is already working for Mummy and Papa.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { done: true, text: "The help button works from today" },
                  { done: true, text: "Reminders start tomorrow morning" },
                  {
                    done: false,
                    text: "Your first Care Brief builds over the next few days",
                  },
                ].map((item) => (
                  <li key={item.text} className="card-calm flex items-center gap-3 p-4">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        item.done ? "bg-sage text-white" : "bg-sage-tint text-sage",
                      )}
                    >
                      {item.done ? (
                        <Check size={18} aria-hidden />
                      ) : (
                        <Clock size={18} aria-hidden />
                      )}
                    </span>
                    <span className="t-body text-text">{item.text}</span>
                    <span className="t-caption ml-auto text-text-soft">
                      {item.done ? "Done" : "Building"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <UButton size="lg" full onClick={finish}>
                  Go to home
                </UButton>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {verifyIndex !== null ? (
          <motion.div
            className="absolute inset-0 z-40 flex items-end bg-text/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Verify your parent's number"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="w-full rounded-t-[1rem] bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="t-body text-text">
                  Ask Mummy to read out the code she just got. This makes sure alerts reach the
                  right phone.
                </p>
                <button
                  onClick={() => setVerifyIndex(null)}
                  aria-label="Close"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-text-soft"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <div className="mt-5">
                <OtpBoxes
                  onDone={() => {
                    const idx = verifyIndex;
                    setTimeout(() => {
                      setParents((ps) =>
                        ps.map((x, j) => (j === idx ? { ...x, verified: true } : x)),
                      );
                      setVerifyIndex(null);
                    }, 350);
                  }}
                />
                <p className="t-caption mt-3 text-text-soft">Use 123456 for the demo.</p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
