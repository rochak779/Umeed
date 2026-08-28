import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Screen, SectionHeader, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { container } from "@/features/authentication/container";
import { useSession } from "@/features/authentication/SessionContext";
import { updateNotificationPreference } from "@/application/use-cases/updateNotificationPreference";
import type { NotificationPreference } from "@/domain/entities/consent";
import type { Channel } from "@/domain/entities/careCircle";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Umeed" }] }),
  component: SettingsScreen,
});

const channels: { channel: Channel; label: string }[] = [
  { channel: "in_app", label: "In-app notifications" },
  { channel: "push", label: "Push notifications" },
  { channel: "sms", label: "Text messages" },
  { channel: "voice", label: "Voice calls" },
  { channel: "email", label: "Email" },
];

function ToggleSwitch({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`flex min-h-11 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
        on ? "bg-sage justify-end" : "bg-line justify-start"
      }`}
      onClick={onToggle}
    >
      <span className="size-6 rounded-full bg-white shadow" />
    </button>
  );
}

function SettingsScreen() {
  const { session, profile, memberships, refresh } = useSession();
  const membership = memberships[0];

  const [displayName, setDisplayName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [urgentOverride, setUrgentOverride] = useState(true);
  const [quietHoursSaved, setQuietHoursSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPreferredName(profile.preferredName);
    }
  }, [profile]);

  const load = async () => {
    if (!session || !membership) return;
    const loaded = await container.consentRepository.findNotificationPreferences(
      session.userId,
      membership.circle.id,
    );
    setPrefs(loaded);
    const first = loaded[0];
    setQuietHoursStart(first?.quietHoursStart ?? "");
    setQuietHoursEnd(first?.quietHoursEnd ?? "");
    setUrgentOverride(first?.urgentAlertsOverrideQuietHours ?? true);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId, membership?.circle.id]);

  if (!session || !profile || !membership) {
    return (
      <>
        <TopBar title="Settings" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">Loading…</p>
        </Screen>
      </>
    );
  }

  const isEnabled = (channel: Channel) => prefs.find((p) => p.channel === channel)?.enabled ?? true;

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    await container.profileRepository.save({
      ...profile,
      displayName,
      preferredName,
      updatedAt: container.clock.now().toISOString(),
    });
    await refresh();
    setSavingProfile(false);
    setProfileSaved(true);
  };

  const savePreference = async (channel: Channel, enabled: boolean) => {
    await updateNotificationPreference(
      {
        consent: container.consentRepository,
        clock: container.clock,
        idGenerator: container.idGenerator,
      },
      {
        userId: session.userId,
        careCircleId: membership.circle.id,
        channel,
        enabled,
        quietHoursStart: quietHoursStart || null,
        quietHoursEnd: quietHoursEnd || null,
        timezone: profile.timezone,
        urgentAlertsOverrideQuietHours: urgentOverride,
      },
    );
    await load();
  };

  const saveQuietHours = async () => {
    setQuietHoursSaved(false);
    for (const { channel } of channels) {
      await updateNotificationPreference(
        {
          consent: container.consentRepository,
          clock: container.clock,
          idGenerator: container.idGenerator,
        },
        {
          userId: session.userId,
          careCircleId: membership.circle.id,
          channel,
          enabled: isEnabled(channel),
          quietHoursStart: quietHoursStart || null,
          quietHoursEnd: quietHoursEnd || null,
          timezone: profile.timezone,
          urgentAlertsOverrideQuietHours: urgentOverride,
        },
      );
    }
    await load();
    setQuietHoursSaved(true);
  };

  return (
    <>
      <TopBar title="Settings" back="/app" />
      <Screen>
        <div>
          <SectionHeader title="Profile" />
          <UCard className="space-y-3">
            <label className="block">
              <span className="t-caption text-text-soft">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setProfileSaved(false);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 t-body text-text"
              />
            </label>
            <label className="block">
              <span className="t-caption text-text-soft">Preferred name</span>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => {
                  setPreferredName(e.target.value);
                  setProfileSaved(false);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 t-body text-text"
              />
            </label>
            <label className="block">
              <span className="t-caption text-text-soft">Email</span>
              <input
                type="email"
                value={profile.email}
                readOnly
                disabled
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-container px-3 t-body text-text-soft"
              />
            </label>
            <UButton onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </UButton>
            {profileSaved ? <p className="t-caption text-sage-dark">Profile saved.</p> : null}
          </UCard>
        </div>

        <div>
          <SectionHeader title="Notifications" hint="Choose how you'd like to hear from Umeed." />
          <div className="space-y-2">
            {channels.map(({ channel, label }) => {
              const enabled = isEnabled(channel);
              return (
                <UCard key={channel} className="flex items-center justify-between gap-4">
                  <p className="t-body font-medium text-text">{label}</p>
                  <ToggleSwitch
                    on={enabled}
                    label={label}
                    onToggle={() => void savePreference(channel, !enabled)}
                  />
                </UCard>
              );
            })}
          </div>
        </div>

        <div>
          <SectionHeader
            title="Quiet hours"
            hint="Applies to all channels. Urgent alerts can still reach you if you allow it below."
          />
          <UCard className="space-y-3">
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="t-caption text-text-soft">Starts</span>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => {
                    setQuietHoursStart(e.target.value);
                    setQuietHoursSaved(false);
                  }}
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 t-body text-text"
                />
              </label>
              <label className="block flex-1">
                <span className="t-caption text-text-soft">Ends</span>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => {
                    setQuietHoursEnd(e.target.value);
                    setQuietHoursSaved(false);
                  }}
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 t-body text-text"
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="t-body font-medium text-text">Urgent alerts override quiet hours</p>
                <p className="t-caption text-text-soft">
                  Let time-critical alerts reach you even during quiet hours.
                </p>
              </div>
              <ToggleSwitch
                on={urgentOverride}
                label="Urgent alerts override quiet hours"
                onToggle={() => {
                  setUrgentOverride((v) => !v);
                  setQuietHoursSaved(false);
                }}
              />
            </div>
            <UButton onClick={() => void saveQuietHours()}>Save quiet hours</UButton>
            {quietHoursSaved ? (
              <p className="t-caption text-sage-dark">Quiet hours saved.</p>
            ) : null}
          </UCard>
        </div>
      </Screen>
    </>
  );
}
