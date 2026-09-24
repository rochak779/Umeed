import type { SupabaseClient } from "@supabase/supabase-js";
import type { OccurrenceRepository } from "@/application/ports/repositories.ts";
import type { RoutineOccurrence } from "@/domain/entities/routine.ts";
import { ConflictError } from "@/domain/errors/DomainError.ts";
import { occurrenceToRow, rowToOccurrence, type OccurrenceRow } from "../mappers/occurrenceMapper.ts";

const RESOLVED_STATUSES = new Set<RoutineOccurrence["status"]>(["resolved", "cancelled"]);

export class SupabaseOccurrenceRepository implements OccurrenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<RoutineOccurrence | null> {
    const { data, error } = await this.client
      .from("occurrences")
      .select("*")
      .eq("id", id)
      .maybeSingle<OccurrenceRow>();
    if (error) throw error;
    return data ? rowToOccurrence(data) : null;
  }

  async findByRoutineAndScheduledForUtc(
    routineId: string,
    scheduledForUtc: string,
  ): Promise<RoutineOccurrence | null> {
    const { data, error } = await this.client
      .from("occurrences")
      .select("*")
      .eq("routine_id", routineId)
      .eq("scheduled_for_utc", scheduledForUtc)
      .maybeSingle<OccurrenceRow>();
    if (error) {
      // `scheduled_for_utc` is a `timestamptz` column: a caller-supplied
      // value that isn't a valid timestamp (e.g. a sentinel "missing" id
      // used by callers/tests to probe for absence) makes Postgres reject
      // the comparison outright rather than simply finding no rows. Treat
      // that the same as "not found" instead of surfacing a raw DB error.
      if (error.code === "22007") return null;
      throw error;
    }
    return data ? rowToOccurrence(data) : null;
  }

  async findByRoutine(routineId: string): Promise<RoutineOccurrence[]> {
    const { data, error } = await this.client
      .from("occurrences")
      .select("*")
      .eq("routine_id", routineId)
      .returns<OccurrenceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToOccurrence);
  }

  async findDue(nowUtc: string): Promise<RoutineOccurrence[]> {
    const { data, error } = await this.client
      .from("occurrences")
      .select("*")
      .lte("scheduled_for_utc", nowUtc)
      .not("status", "in", `(${Array.from(RESOLVED_STATUSES).join(",")})`)
      .returns<OccurrenceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToOccurrence);
  }

  async save(occurrence: RoutineOccurrence): Promise<void> {
    const { error } = await this.client
      .from("occurrences")
      .upsert(occurrenceToRow(occurrence), { onConflict: "id" });
    if (error) {
      if (error.code === "23505" && error.message.includes("occurrences_routine_scheduled_idx")) {
        throw new ConflictError(
          `Occurrence already exists for routine ${occurrence.routineId} at ${occurrence.scheduledForUtc}`,
        );
      }
      throw error;
    }
  }
}
