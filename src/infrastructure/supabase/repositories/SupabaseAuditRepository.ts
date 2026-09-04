import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditRepository } from "@/application/ports/repositories";
import type { AuditEvent } from "@/domain/entities/consent";
import { ConflictError } from "@/domain/errors/DomainError";
import { auditEventToRow, rowToAuditEvent, type AuditEventRow } from "../mappers/auditMapper";

/**
 * Must be constructed with the service-role client: Task 6's RLS migration
 * grants no `insert` policy for `authenticated`/`anon` on `audit_events`
 * (only `select`), so application code writes audit rows only from
 * trusted server-side use cases.
 */
export class SupabaseAuditRepository implements AuditRepository {
  constructor(private readonly client: SupabaseClient) {}

  async append(event: AuditEvent): Promise<void> {
    const { error } = await this.client.from("audit_events").insert(auditEventToRow(event));
    if (error) {
      if (error.code === "23505") {
        throw new ConflictError(`Audit event ${event.id} already exists`);
      }
      throw error;
    }
  }

  async findByCareCircle(careCircleId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.client
      .from("audit_events")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<AuditEventRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAuditEvent);
  }
}
