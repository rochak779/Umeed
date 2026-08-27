import {
  ConsentRecordSchema,
  NotificationPreferenceSchema,
  type ConsentRecord,
  type NotificationPreference,
} from "../../../domain/entities/consent";
import type { ConsentRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalConsentRepository implements ConsentRepository {
  private readonly consents: LocalCollection<ConsentRecord>;
  private readonly preferences: LocalCollection<NotificationPreference>;

  constructor(store: KeyValueStore) {
    this.consents = new LocalCollection(store, "umeed.consent_records", ConsentRecordSchema, 1);
    this.preferences = new LocalCollection(
      store,
      "umeed.notification_preferences",
      NotificationPreferenceSchema,
      1,
    );
  }

  async findByCareCircle(careCircleId: string): Promise<ConsentRecord[]> {
    return this.consents.all().filter((c) => c.careCircleId === careCircleId);
  }

  async save(record: ConsentRecord): Promise<void> {
    this.consents.save(record);
  }

  async findNotificationPreferences(
    userId: string,
    careCircleId: string,
  ): Promise<NotificationPreference[]> {
    return this.preferences
      .all()
      .filter((p) => p.userId === userId && p.careCircleId === careCircleId);
  }

  async saveNotificationPreference(preference: NotificationPreference): Promise<void> {
    this.preferences.save(preference);
  }
}
