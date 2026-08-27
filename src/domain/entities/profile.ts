import { z } from "zod";

/**
 * UserProfile (Implementation.md §8.1). Deliberately has no global `role`
 * field — authorisation always comes from CircleMember membership.
 */
export const OnboardingStatusSchema = z.enum(["not_started", "in_progress", "complete"]);
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

export const AccessibilityPreferencesSchema = z.object({
  largeText: z.boolean(),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
});
export type AccessibilityPreferences = z.infer<typeof AccessibilityPreferencesSchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  preferredName: z.string().min(1),
  phone: z.string().nullable(),
  email: z.string().email(),
  timezone: z.string().min(1),
  locale: z.string().min(1),
  accessibilityPreferences: AccessibilityPreferencesSchema,
  onboardingStatus: OnboardingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
