import {
  EscalationPolicySchema,
  RoutineSchema,
  type EscalationPolicy,
  type Routine,
} from "../../../domain/entities/routine";
import type { RoutineRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalRoutineRepository implements RoutineRepository {
  private readonly routines: LocalCollection<Routine>;
  private readonly policies: LocalCollection<EscalationPolicy>;

  constructor(store: KeyValueStore) {
    this.routines = new LocalCollection(store, "umeed.routines", RoutineSchema, 1);
    this.policies = new LocalCollection(
      store,
      "umeed.escalation_policies",
      EscalationPolicySchema,
      1,
    );
  }

  async findById(id: string): Promise<Routine | null> {
    return this.routines.findById(id);
  }

  async findByCareCircle(careCircleId: string): Promise<Routine[]> {
    return this.routines.all().filter((r) => r.careCircleId === careCircleId);
  }

  async save(routine: Routine): Promise<void> {
    this.routines.save(routine);
  }

  async findEscalationPolicy(routineId: string): Promise<EscalationPolicy | null> {
    return this.policies.all().find((p) => p.routineId === routineId) ?? null;
  }

  async saveEscalationPolicy(policy: EscalationPolicy): Promise<void> {
    this.policies.save(policy);
  }
}
