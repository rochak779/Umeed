import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsentRepository } from "@/application/ports/repositories";
import type { ConsentRecord, NotificationPreference } from "@/domain/entities/consent";
import {
  consentRecordToRow,
  rowToConsentRecord,
  type ConsentRecordRow,
  notificationPreferenceToRow,
  rowToNotificationPreference,
  type NotificationPreferenceRow,
} from "../mappers/consentMapper";

export class SupabaseConsentRepository implements ConsentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByCareCircle(careCircleId: string): Promise<ConsentRecord[]> {
    const { data, error } = await this.client
      .from("consent_records")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<ConsentRecordRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToConsentRecord);
  }

  async save(record: ConsentRecord): Promise<void> {
    const { error } = await this.client
      .from("consent_records")
      .upsert(consentRecordToRow(record), { onConflict: "id" });
    if (error) throw error;
  }

  async findNotificationPreferences(
    userId: string,
    careCircleId: string,
  ): Promise<NotificationPreference[]> {
    const { data, error } = await this.client
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("care_circle_id", careCircleId)
      .returns<NotificationPreferenceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToNotificationPreference);
  }

  async saveNotificationPreference(preference: NotificationPreference): Promise<void> {
    const { error } = await this.client
      .from("notification_preferences")
      .upsert(notificationPreferenceToRow(preference), { onConflict: "id" });
    if (error) throw error;
  }
}
