import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunicationRepository } from "@/application/ports/repositories.ts";
import type { CommunicationEvent } from "@/domain/entities/alert.ts";
import { ConflictError } from "@/domain/errors/DomainError.ts";
import {
  communicationEventToRow,
  rowToCommunicationEvent,
  type CommunicationEventRow,
} from "../mappers/communicationMapper.ts";

export class SupabaseCommunicationRepository implements CommunicationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<CommunicationEvent | null> {
    const { data, error } = await this.client
      .from("communication_events")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle<CommunicationEventRow>();
    if (error) throw error;
    return data ? rowToCommunicationEvent(data) : null;
  }

  async save(event: CommunicationEvent): Promise<void> {
    const { error } = await this.client
      .from("communication_events")
      .upsert(communicationEventToRow(event), { onConflict: "id" });
    if (error) {
      if (
        error.code === "23505" &&
        error.message.includes("communication_events_idempotency_key_idx")
      ) {
        throw new ConflictError(
          `Communication event with idempotency key ${event.idempotencyKey} already exists`,
        );
      }
      throw error;
    }
  }
}
