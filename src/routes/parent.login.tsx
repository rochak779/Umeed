import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Screen, UButton, UCard } from "@/components/umeed/primitives";
import { Wordmark } from "@/components/umeed/Wordmark";
import { useUmeed } from "@/state/UmeedProvider";
import { useParentLang } from "@/i18n/parent";

export const Route = createFileRoute("/parent/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Umeed for parents" },
      {
        name: "description",
        content: "One phone number, one code, large buttons. Nothing else to remember.",
      },
      { property: "og:title", content: "Sign in — Umeed for parents" },
      {
        property: "og:description",
        content: "Aditi has already set this up. Just confirm it is you.",
      },
    ],
  }),
  component: ParentLogin,
});

function ParentLogin() {
  const navigate = useNavigate();
  const { data, setPersona } = useUmeed();
  const { t } = useParentLang();
  const parent = data.family.find((p) => p.id === "anuradha");
  const child = data.family.find((p) => p.role === "child");
  const childName = child?.shortName ?? "Aditi";
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");

  return (
    <>
      <div className="px-5 pt-8">
        <Wordmark />
      </div>
      <Screen className="px-5">
        <h1 className="t-hero text-text">
          {step === "phone" ? t.loginTitle(parent?.shortName ?? "Anuradha") : t.codeTitle}
        </h1>
        <p className="t-body text-text-soft">
          {step === "phone" ? t.loginSubtitle(childName) : t.codeSubtitle}
        </p>

        {step === "phone" ? (
          <UCard className="space-y-4">
            <p className="t-caption text-text-soft">{t.yourPhone}</p>
            <p className="t-hero tracking-wide text-text">{parent?.phone ?? "+91 98330 71822"}</p>
            <UButton size="xl" full onClick={() => setStep("code")}>
              {t.yesThisIsMine} <ArrowRight size={22} aria-hidden />
            </UButton>
            <UButton variant="ghost" size="lg" full>
              <PhoneCall size={20} aria-hidden /> {t.askChildToCall(childName)}
            </UButton>
          </UCard>
        ) : (
          <UCard className="space-y-4">
            <label className="block">
              <span className="t-caption mb-2 block text-text-soft">{t.sixNumbers}</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                className="t-hero min-h-16 w-full rounded-[0.875rem] border-2 border-line bg-bg px-4 text-center tracking-[0.4em] text-text"
              />
            </label>
            <UButton
              size="xl"
              full
              disabled={code.length < 6}
              onClick={() => {
                setPersona("parent");
                navigate({
                  to: data.parentOnboarded ? "/parent/home" : "/parent/welcome",
                });
              }}
            >
              {t.goInside} <ArrowRight size={22} aria-hidden />
            </UButton>
            <UButton variant="ghost" size="lg" full onClick={() => setStep("phone")}>
              {t.goBack}
            </UButton>
          </UCard>
        )}
      </Screen>
    </>
  );
}
