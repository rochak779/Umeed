import { ConflictError } from "../../../domain/errors/DomainError";
import { RoutineOccurrenceSchema, type RoutineOccurrence } from "../../../domain/entities/routine";
import type { OccurrenceRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

const RESOLVED_STATUSES = new Set(["resolved", "cancelled"]);

export class LocalOccurrenceRepository implements OccurrenceRepository {
  private readonly collection: LocalCollection<RoutineOccurrence>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(store, "umeed.occurrences", RoutineOccurrenceSchema, 1);
  }

  async findById(id: string): Promise<RoutineOccurrence | null> {
    return this.collection.findById(id);
  }

  async findByRoutineAndScheduledForUtc(
    routineId: string,
    scheduledForUtc: string,
  ): Promise<RoutineOccurrence | null> {
    return (
      this.collection
        .all()
        .find((o) => o.routineId === routineId && o.scheduledForUtc === scheduledForUtc) ?? null
    );
  }

  async findByRoutine(routineId: string): Promise<RoutineOccurrence[]> {
    return this.collection.all().filter((o) => o.routineId === routineId);
  }

  async findDue(nowUtc: string): Promise<RoutineOccurrence[]> {
    return this.collection
      .all()
      .filter((o) => o.scheduledForUtc <= nowUtc && !RESOLVED_STATUSES.has(o.status));
  }

  async save(occurrence: RoutineOccurrence): Promise<void> {
    const existing = await this.findByRoutineAndScheduledForUtc(
      occurrence.routineId,
      occurrence.scheduledForUtc,
    );
    if (existing && existing.id !== occurrence.id) {
      throw new ConflictError(
        `An occurrence for routine ${occurrence.routineId} at ${occurrence.scheduledForUtc} already exists`,
      );
    }
    this.collection.save(occurrence);
  }
}
