import { CommunicationEventSchema, type CommunicationEvent } from "../../../domain/entities/alert";
import type { CommunicationRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalCommunicationRepository implements CommunicationRepository {
  private readonly collection: LocalCollection<CommunicationEvent>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(
      store,
      "umeed.communication_events",
      CommunicationEventSchema,
      1,
    );
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<CommunicationEvent | null> {
    return this.collection.all().find((e) => e.idempotencyKey === idempotencyKey) ?? null;
  }

  async save(event: CommunicationEvent): Promise<void> {
    this.collection.save(event);
  }
}
