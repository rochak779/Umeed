import { ConflictError } from "../../../domain/errors/DomainError";
import { AuditEventSchema, type AuditEvent } from "../../../domain/entities/consent";
import type { AuditRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

/**
 * Audit records are append-oriented (Implementation.md §18): no update/delete
 * method exists, and `append` itself refuses to let a caller silently
 * overwrite a previously appended event by id (LocalCollection.save would
 * otherwise upsert, which would make the audit trail mutable).
 */
export class LocalAuditRepository implements AuditRepository {
  private readonly collection: LocalCollection<AuditEvent>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(store, "umeed.audit_events", AuditEventSchema, 1);
  }

  async append(event: AuditEvent): Promise<void> {
    if (this.collection.findById(event.id)) {
      throw new ConflictError(`An audit event with id ${event.id} already exists`);
    }
    this.collection.save(event);
  }

  async findByCareCircle(careCircleId: string): Promise<AuditEvent[]> {
    return this.collection.all().filter((e) => e.careCircleId === careCircleId);
  }
}
