import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { useUmeed } from "@/state/UmeedProvider";
import { useParentLang } from "@/i18n/parent";

export const Route = createFileRoute("/parent/profile")({
  head: () => ({
    meta: [
      { title: "My details — Umeed for parents" },
      {
        name: "description",
        content: "Your name, age, phone, email and reading language — change any of them anytime.",
      },
      { property: "og:title", content: "My details — Umeed for parents" },
      {
        property: "og:description",
        content: "Large-type profile screen for the parent, editable in one place.",
      },
    ],
  }),
  component: ParentProfile,
});

const LANGUAGES = ["English", "हिन्दी"];

function ParentProfile() {
  const { data, updatePerson } = useUmeed();
  const { t } = useParentLang();
  const parent = data.family.find((p) => p.id === "anuradha");

  const [name, setName] = useState(parent?.name ?? "");
  const [age, setAge] = useState(String(parent?.age ?? ""));
  const [phone, setPhone] = useState(parent?.phone ?? "");
  const [email, setEmail] = useState(parent?.email ?? "");
  const [language, setLanguage] = useState(parent?.language ?? "English");

  const save = () => {
    if (!name.trim()) {
      toast.error(t.nameNeeded);
      return;
    }
    updatePerson("anuradha", {
      name: name.trim(),
      age: Number(age) || (parent?.age ?? 0),
      phone: phone.trim(),
      email: email.trim(),
      language,
    });
    toast.success(t.detailsSaved);
  };

  return (
    <>
      <TopBar title={t.myDetails} back="/parent/home" />

      <Screen className="px-5">
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="flex size-24 items-center justify-center rounded-full bg-sage-tint text-sage-dark">
            <UserRound size={44} aria-hidden />
          </span>
          <p className="t-section text-text">{parent?.shortName ?? "Mummy"}</p>
        </div>

        <UCard className="space-y-5 p-5">
          <Field label={t.fullName} value={name} onChange={setName} />
          <Field label={t.age} value={age} onChange={setAge} inputMode="numeric" />
          <Field label={t.phone} value={phone} onChange={setPhone} inputMode="tel" />
          <Field
            label={t.email}
            value={email}
            onChange={setEmail}
            inputMode="email"
            placeholder="name@email.com"
          />

          <div className="space-y-2">
            <p className="t-caption font-medium text-text-soft">{t.readingLanguage}</p>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((l) => {
                const on = l === language;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    aria-pressed={on}
                    className={
                      on
                        ? "flex min-h-16 items-center justify-center gap-2 rounded-full bg-sage text-white t-body font-semibold"
                        : "flex min-h-16 items-center justify-center gap-2 rounded-full border border-line bg-container text-text t-body"
                    }
                  >
                    {on ? <Check size={20} aria-hidden /> : null}
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </UCard>

        <UButton size="xl" full className="min-h-20 t-section" onClick={save}>
          <Check size={28} aria-hidden /> {t.saveChanges}
        </UButton>

        <p className="t-caption pb-2 text-center text-text-soft">{t.detailsPrivate}</p>
      </Screen>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "tel" | "email" | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <label className="block space-y-2">
      <span className="t-caption font-medium text-text-soft">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-16 w-full rounded-[1rem] border border-line bg-container px-4 t-body text-text outline-none focus:border-sage"
      />
    </label>
  );
}
