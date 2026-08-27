import { UserProfileSchema, type UserProfile } from "../../../domain/entities/profile";
import type { ProfileRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalProfileRepository implements ProfileRepository {
  private readonly collection: LocalCollection<UserProfile>;

  constructor(store: KeyValueStore) {
    this.collection = new LocalCollection(store, "umeed.profiles", UserProfileSchema, 1);
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.collection.findById(id);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return this.collection.all().find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async save(profile: UserProfile): Promise<void> {
    this.collection.save(profile);
  }
}
