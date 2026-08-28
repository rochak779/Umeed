import { AuditEventSchema, type AuditEvent } from "../../../domain/entities/consent";
import type { AuditRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

/** Audit records are append-oriented (Implementation.md §18): no update/delete method exists. */
export class LocalAuditRepository implements AuditRepository {
  private readonly collection: LocalCollection<AuditEvent>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(store, "umeed.audit_events", AuditEventSchema, 1);
  }

  async append(event: AuditEvent): Promise<void> {
    this.collection.save(event);
  }

  async findByCareCircle(careCircleId: string): Promise<AuditEvent[]> {
    return this.collection.all().filter((e) => e.careCircleId === careCircleId);
  }
}
