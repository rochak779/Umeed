import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertRepository } from "@/application/ports/repositories.ts";
import type { Alert, AlertRecipient } from "@/domain/entities/alert.ts";
import {
  alertToRow,
  rowToAlert,
  type AlertRow,
  alertRecipientToRow,
  rowToAlertRecipient,
  type AlertRecipientRow,
} from "../mappers/alertMapper.ts";

const CLOSED_STATUSES = ["resolved", "unresolved", "cancelled"];

export class SupabaseAlertRepository implements AlertRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Alert | null> {
    const { data, error } = await this.client
      .from("alerts")
      .select("*")
      .eq("id", id)
      .maybeSingle<AlertRow>();
    if (error) throw error;
    return data ? rowToAlert(data) : null;
  }

  async findByCareCircle(careCircleId: string): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alerts")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<AlertRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlert);
  }

  async findOpenByCareCircle(careCircleId: string): Promise<Alert[]> {
    const { data, error } = await this.client
      .from("alerts")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .not("status", "in", `(${CLOSED_STATUSES.join(",")})`)
      .returns<AlertRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlert);
  }

  async save(alert: Alert): Promise<void> {
    const { error } = await this.client
      .from("alerts")
      .upsert(alertToRow(alert), { onConflict: "id" });
    if (error) throw error;
  }

  async tryClaim(
    alertId: string,
    claimedBy: string,
    claimedAt: string,
    claimExpiresAt: string,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc("claim_alert", {
      p_alert_id: alertId,
      p_claimed_by: claimedBy,
      p_claimed_at: claimedAt,
      p_claim_expires_at: claimExpiresAt,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async findRecipients(alertId: string): Promise<AlertRecipient[]> {
    const { data, error } = await this.client
      .from("alert_recipients")
      .select("*")
      .eq("alert_id", alertId)
      .returns<AlertRecipientRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAlertRecipient);
  }

  async saveRecipient(recipient: AlertRecipient): Promise<void> {
    const { error } = await this.client
      .from("alert_recipients")
      .upsert(alertRecipientToRow(recipient), { onConflict: "id" });
    if (error) throw error;
  }
}
