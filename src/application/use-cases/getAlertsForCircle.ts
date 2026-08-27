import type {
  AlertRepository,
  CareCircleRepository,
  ProfileRepository,
} from "../ports/repositories";
import type { Alert } from "../../domain/entities/alert";

export type AlertView = Alert & { claimedByName: string | null };

export type GetAlertsForCircleDeps = {
  alerts: AlertRepository;
  careCircles: CareCircleRepository;
  profiles: ProfileRepository;
};

/** Alerts for the family/responder alert screen and timeline (Implementation.md §7.9). */
export async function getAlertsForCircle(
  deps: GetAlertsForCircleDeps,
  input: { careCircleId: string },
): Promise<AlertView[]> {
  const alerts = await deps.alerts.findByCareCircle(input.careCircleId);
  const views: AlertView[] = [];
  for (const alert of alerts.sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))) {
    const claimedByName = alert.claimedBy
      ? ((await deps.profiles.findById(alert.claimedBy))?.preferredName ?? null)
      : null;
    views.push({ ...alert, claimedByName });
  }
  return views;
}
