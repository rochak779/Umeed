import type { UserProfile } from "@/domain/entities/profile";

export type ProfileRow = {
  id: string;
  display_name: string;
  preferred_name: string;
  phone: string | null;
  address: string | null;
  email: string;
  timezone: string;
  locale: string;
  accessibility_large_text: boolean;
  accessibility_reduced_motion: boolean;
  accessibility_high_contrast: boolean;
  onboarding_status: UserProfile["onboardingStatus"];
  created_at: string;
  updated_at: string;
};

export function profileToRow(profile: UserProfile): ProfileRow {
  return {
    id: profile.id,
    display_name: profile.displayName,
    preferred_name: profile.preferredName,
    phone: profile.phone,
    address: profile.address,
    email: profile.email,
    timezone: profile.timezone,
    locale: profile.locale,
    accessibility_large_text: profile.accessibilityPreferences.largeText,
    accessibility_reduced_motion: profile.accessibilityPreferences.reducedMotion,
    accessibility_high_contrast: profile.accessibilityPreferences.highContrast,
    onboarding_status: profile.onboardingStatus,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    preferredName: row.preferred_name,
    phone: row.phone,
    address: row.address,
    email: row.email,
    timezone: row.timezone,
    locale: row.locale,
    accessibilityPreferences: {
      largeText: row.accessibility_large_text,
      reducedMotion: row.accessibility_reduced_motion,
      highContrast: row.accessibility_high_contrast,
    },
    onboardingStatus: row.onboarding_status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/**
 * Postgres `timestamptz` columns come back from PostgREST as
 * `2026-01-01T00:00:00+00:00`, not the `...Z` suffix the domain layer's
 * entities and builders use everywhere. Normalise on read so round-trips
 * are exact and callers never see the offset form.
 */
function toIso(value: string): string {
  return new Date(value).toISOString();
}
