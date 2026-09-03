import type { SupabaseClient } from "@supabase/supabase-js";
import type { CareCircleRepository } from "@/application/ports/repositories";
import type { CareCircle, CircleMember, MemberPermission } from "@/domain/entities/careCircle";
import {
  careCircleToRow,
  rowToCareCircle,
  type CareCircleRow,
  circleMemberToRow,
  rowToCircleMember,
  type CircleMemberRow,
  memberPermissionToRow,
  rowToMemberPermission,
  type MemberPermissionRow,
} from "../mappers/careCircleMapper";

export class SupabaseCareCircleRepository implements CareCircleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<CareCircle | null> {
    const { data, error } = await this.client
      .from("care_circles")
      .select("*")
      .eq("id", id)
      .maybeSingle<CareCircleRow>();
    if (error) throw error;
    return data ? rowToCareCircle(data) : null;
  }

  async findByUserId(userId: string): Promise<CareCircle[]> {
    const { data, error } = await this.client
      .from("circle_members")
      .select("care_circles(*)")
      .eq("user_id", userId)
      .eq("membership_status", "active")
      .returns<{ care_circles: CareCircleRow }[]>();
    if (error) throw error;
    return (data ?? []).map((row) => rowToCareCircle(row.care_circles));
  }

  async save(circle: CareCircle): Promise<void> {
    const { error } = await this.client
      .from("care_circles")
      .upsert(careCircleToRow(circle), { onConflict: "id" });
    if (error) throw error;
  }

  async findMembers(careCircleId: string): Promise<CircleMember[]> {
    const { data, error } = await this.client
      .from("circle_members")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<CircleMemberRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToCircleMember);
  }

  async findMemberById(id: string): Promise<CircleMember | null> {
    const { data, error } = await this.client
      .from("circle_members")
      .select("*")
      .eq("id", id)
      .maybeSingle<CircleMemberRow>();
    if (error) throw error;
    return data ? rowToCircleMember(data) : null;
  }

  async findMemberByUserAndCircle(
    userId: string,
    careCircleId: string,
  ): Promise<CircleMember | null> {
    const { data, error } = await this.client
      .from("circle_members")
      .select("*")
      .eq("user_id", userId)
      .eq("care_circle_id", careCircleId)
      .maybeSingle<CircleMemberRow>();
    if (error) throw error;
    return data ? rowToCircleMember(data) : null;
  }

  async saveMember(member: CircleMember): Promise<void> {
    const { error } = await this.client
      .from("circle_members")
      .upsert(circleMemberToRow(member), { onConflict: "id" });
    if (error) throw error;
  }

  async findPermission(circleMemberId: string): Promise<MemberPermission | null> {
    const { data, error } = await this.client
      .from("member_permissions")
      .select("*")
      .eq("circle_member_id", circleMemberId)
      .maybeSingle<MemberPermissionRow>();
    if (error) throw error;
    return data ? rowToMemberPermission(data) : null;
  }

  async savePermission(permission: MemberPermission): Promise<void> {
    const { error } = await this.client
      .from("member_permissions")
      .upsert(memberPermissionToRow(permission), { onConflict: "id" });
    if (error) throw error;
  }
}
