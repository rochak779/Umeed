import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoutineRepository } from "@/application/ports/repositories.ts";
import type { EscalationPolicy, Routine } from "@/domain/entities/routine.ts";
import {
  routineToRow,
  rowToRoutine,
  type RoutineRow,
  escalationPolicyToRow,
  rowToEscalationPolicy,
  type EscalationPolicyRow,
} from "../mappers/routineMapper.ts";

export class SupabaseRoutineRepository implements RoutineRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Routine | null> {
    const { data, error } = await this.client
      .from("routines")
      .select("*")
      .eq("id", id)
      .maybeSingle<RoutineRow>();
    if (error) throw error;
    return data ? rowToRoutine(data) : null;
  }

  async findByCareCircle(careCircleId: string): Promise<Routine[]> {
    const { data, error } = await this.client
      .from("routines")
      .select("*")
      .eq("care_circle_id", careCircleId)
      .returns<RoutineRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToRoutine);
  }

  async save(routine: Routine): Promise<void> {
    const { error } = await this.client
      .from("routines")
      .upsert(routineToRow(routine), { onConflict: "id" });
    if (error) throw error;
  }

  async findEscalationPolicy(routineId: string): Promise<EscalationPolicy | null> {
    const { data, error } = await this.client
      .from("escalation_policies")
      .select("*")
      .eq("routine_id", routineId)
      .maybeSingle<EscalationPolicyRow>();
    if (error) throw error;
    return data ? rowToEscalationPolicy(data) : null;
  }

  async saveEscalationPolicy(policy: EscalationPolicy): Promise<void> {
    const { error } = await this.client
      .from("escalation_policies")
      .upsert(escalationPolicyToRow(policy), { onConflict: "id" });
    if (error) throw error;
  }
}
