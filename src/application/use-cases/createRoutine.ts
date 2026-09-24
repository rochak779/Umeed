import type {
  CareCircleRepository,
  RoutineRepository,
  OccurrenceRepository,
  AuditRepository,
} from "../ports/repositories";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import { ValidationError } from "../../domain/errors/DomainError";
import { assertPermission } from "../../domain/policies/permissionGuard";
import { RoutineSchema, type Routine, type RoutineType } from "../../domain/entities/routine";
import { generateOccurrences } from "./generateOccurrences";
import { DEFAULT_ESCALATION_STEPS } from "../../domain/policies/defaultEscalationPolicy";

const LOOKAHEAD_DAYS = 14;

export type CreateRoutineDeps = {
  careCircles: CareCircleRepository;
  routines: RoutineRepository;
  occurrences: OccurrenceRepository;
  audit: AuditRepository;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type CreateRoutineInput = {
  actorUserId: string;
  careCircleId: string;
  olderAdultId: string | null;
  type: RoutineType;
  title: string;
  description: string | null;
  timezone: string;
  localTime: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  gracePeriodMinutes: number;
};

/**
 * Coordinator (or older adult) creates a routine (Implementation.md §7.7).
 * Validated with the same schema used for persistence — schedule mistakes
 * are rejected here, not discovered later at occurrence-generation time.
 * Requires canManageRoutines.
 */
export async function createRoutine(
  deps: CreateRoutineDeps,
  input: CreateRoutineInput,
): Promise<Routine> {
  const actorMember = await deps.careCircles.findMemberByUserAndCircle(
    input.actorUserId,
    input.careCircleId,
  );
  const actorPermission = actorMember
    ? await deps.careCircles.findPermission(actorMember.id)
    : null;
  assertPermission(actorPermission, "canManageRoutines");

  const nowIso = deps.clock.now().toISOString();
  const parsed = RoutineSchema.safeParse({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    olderAdultId: input.olderAdultId,
    type: input.type,
    title: input.title,
    description: input.description,
    timezone: input.timezone,
    localTime: input.localTime,
    daysOfWeek: input.daysOfWeek,
    startDate: input.startDate,
    endDate: input.endDate,
    gracePeriodMinutes: input.gracePeriodMinutes,
    visibility: "family_and_nearby",
    enabled: true,
    notificationChannels: ["in_app"],
    createdBy: input.actorUserId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
  }

  await deps.routines.save(parsed.data);
  await deps.routines.saveEscalationPolicy({
    id: deps.idGenerator.nextId(),
    routineId: parsed.data.id,
    name: "Default",
    enabled: true,
    steps: DEFAULT_ESCALATION_STEPS.map((step) => ({ ...step })),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const upToDate = addDays(input.startDate, LOOKAHEAD_DAYS);
  await generateOccurrences(
    {
      routines: deps.routines,
      occurrences: deps.occurrences,
      idGenerator: deps.idGenerator,
      clock: deps.clock,
    },
    { routineId: parsed.data.id, upToLocalDate: upToDate },
  );

  await deps.audit.append({
    id: deps.idGenerator.nextId(),
    careCircleId: input.careCircleId,
    actorId: input.actorUserId,
    actorType: "user",
    action: "routine.created",
    entityType: "Routine",
    entityId: parsed.data.id,
    timestamp: nowIso,
    metadata: { type: input.type },
  });

  return parsed.data;
}

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
