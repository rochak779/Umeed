import { InvitationSchema, type Invitation } from "../../../domain/entities/invitation";
import type { InvitationRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalInvitationRepository implements InvitationRepository {
  private readonly collection: LocalCollection<Invitation>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(store, "umeed.invitations", InvitationSchema, 1);
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.collection.findById(id);
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.collection.all().find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async findByCareCircle(careCircleId: string): Promise<Invitation[]> {
    return this.collection.all().filter((i) => i.careCircleId === careCircleId);
  }

  async save(invitation: Invitation): Promise<void> {
    this.collection.save(invitation);
  }
}
