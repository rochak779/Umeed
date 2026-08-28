import {
  AlertSchema,
  type Alert,
  type AlertRecipient,
  AlertRecipientSchema,
} from "../../../domain/entities/alert";
import type { AlertRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

const UNCLAIMABLE_STATUSES = new Set<Alert["status"]>([
  "claimed",
  "resolved",
  "unresolved",
  "cancelled",
]);

export class LocalAlertRepository implements AlertRepository {
  private readonly alerts: LocalCollection<Alert>;
  private readonly recipients: LocalCollection<AlertRecipient>;

  constructor(store: KeyValueStore) {
    this.alerts = new LocalCollection(store, "umeed.alerts", AlertSchema, 1);
    this.recipients = new LocalCollection(store, "umeed.alert_recipients", AlertRecipientSchema, 1);
  }

  async findById(id: string): Promise<Alert | null> {
    return this.alerts.findById(id);
  }

  async findByCareCircle(careCircleId: string): Promise<Alert[]> {
    return this.alerts.all().filter((a) => a.careCircleId === careCircleId);
  }

  async findOpenByCareCircle(careCircleId: string): Promise<Alert[]> {
    return this.alerts
      .all()
      .filter(
        (a) =>
          a.careCircleId === careCircleId &&
          !["resolved", "unresolved", "cancelled"].includes(a.status),
      );
  }

  async save(alert: Alert): Promise<void> {
    this.alerts.save(alert);
  }

  /**
   * Single-threaded JS means this whole check-then-set body runs to
   * completion before any other call can interleave, which is exactly the
   * atomicity Implementation.md §9.3 asks for locally. The Supabase
   * equivalent will use a database-level compare-and-set / RPC to get the
   * same guarantee across processes.
   */
  async tryClaim(
    alertId: string,
    claimedBy: string,
    claimedAt: string,
    claimExpiresAt: string,
  ): Promise<boolean> {
    const alert = this.alerts.findById(alertId);
    if (!alert) return false;
    if (UNCLAIMABLE_STATUSES.has(alert.status)) return false;

    this.alerts.save({
      ...alert,
      status: "claimed",
      claimedBy,
      claimedAt,
      claimExpiresAt,
      updatedAt: claimedAt,
    });
    return true;
  }

  async findRecipients(alertId: string): Promise<AlertRecipient[]> {
    return this.recipients.all().filter((r) => r.alertId === alertId);
  }

  async saveRecipient(recipient: AlertRecipient): Promise<void> {
    this.recipients.save(recipient);
  }
}
