import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRepository } from "@/application/ports/repositories";
import type { UserProfile } from "@/domain/entities/profile";
import { profileToRow, rowToProfile, type ProfileRow } from "../mappers/profileMapper";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async save(profile: UserProfile): Promise<void> {
    const { error } = await this.client
      .from("profiles")
      .upsert(profileToRow(profile), { onConflict: "id" });
    if (error) throw error;
  }
}
