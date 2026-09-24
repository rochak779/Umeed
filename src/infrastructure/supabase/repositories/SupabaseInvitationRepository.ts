import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvitationRepository } from "@/application/ports/repositories";
import type { Invitation } from "@/domain/entities/invitation";
import { invitationToRow, rowToInvitation, type InvitationRow } from "../mappers/invitationMapper";

export class SupabaseInvitationRepository implements InvitationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("id", id)
      .maybeSingle<InvitationRow>();
    if (error) throw error;
    return data ? rowToInvitation(data) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle<InvitationRow>();
    if (error) throw error;
    return data ? rowToInvitation(data) : null;
  }

  async findByCareCircle(careCircleId: string): Promise<Invitation[]> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<InvitationRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToInvitation);
  }

  async save(invitation: Invitation): Promise<void> {
    const { error } = await this.client
      .from("invitations")
      .upsert(invitationToRow(invitation), { onConflict: "id" });
    if (error) throw error;
  }
}
