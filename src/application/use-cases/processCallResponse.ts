import type { CommunicationRepository } from "../ports/repositories";
import type { NotificationGateway } from "../ports/infra";
import type { Clock } from "../../shared/time/Clock";
import type { IdGenerator } from "../../shared/id/IdGenerator";
import type { RoutineOccurrence, Routine } from "../../domain/entities/routine";
import type { CareCircle, CircleMember } from "../../domain/entities/careCircle";
import type { Alert, AlertRecipient } from "../../domain/entities/alert";
import type { AuditEvent } from "../../domain/entities/consent";
import { acknowledgeOccurrence, type AcknowledgeOccurrenceDeps } from "./acknowledgeOccurrence";
import { raiseDirectHelpAlert, type RaiseDirectHelpAlertDeps } from "./raiseDirectHelpAlert";

/**
 * Narrower than the full repository ports (only the methods
 * acknowledgeOccurrence/raiseDirectHelpAlert actually call) so the caller
 * only has to supply what this use case needs, mirroring the
 * SendAlertNotificationsDeps pattern from Task 2. Passed through to those
 * use cases via a structural cast — the runtime shape matches exactly.
 */
export type ProcessCallResponseDeps = {
  occurrences: {
    findById(id: string): Promise<RoutineOccurrence | null>;
    save(occurrence: RoutineOccurrence): Promise<void>;
  };
  routines: {
    findById(id: string): Promise<Routine | null>;
  };
  careCircles: {
    findById(id: string): Promise<CareCircle | null>;
    findByUserId(userId: string): Promise<CareCircle[]>;
    findMembers(careCircleId: string): Promise<CircleMember[]>;
  };
  alerts: {
    save(alert: Alert): Promise<void>;
    saveRecipient(recipient: AlertRecipient): Promise<void>;
  };
  communications: CommunicationRepository;
  notificationGateway: NotificationGateway;
  audit: {
    append(event: AuditEvent): Promise<void>;
  };
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ProcessCallResponseResult = {
  ok: true;
  action: "acknowledged" | "help_requested" | "replayed" | "already_processed";
};

/**
 * Mock voice-call keypad handling (Implementation.md §16 Phase 6, voice
 * script in §11). Keyed by providerReference so a duplicate provider
 * callback for the same call attempt never runs twice — this stands in for
 * Twilio webhook idempotency ahead of Phase 11. This never dials anything
 * itself: it only interprets a keypad digit the mock voice provider already
 * reported back to us (Umeed must never automatically call 999/111).
 */
export async function processCallResponse(
  deps: ProcessCallResponseDeps,
  input: {
    occurrenceId: string;
    olderAdultUserId: string;
    keypad: "1" | "2" | "3";
    providerReference: string;
  },
): Promise<ProcessCallResponseResult> {
  const idempotencyKey = `call-response:${input.providerReference}`;
  const existing = await deps.communications.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    return { ok: true, action: "already_processed" };
  }

  const nowIso = deps.clock.now().toISOString();
  await deps.communications.save({
    id: deps.idGenerator.nextId(),
    alertId: null,
    occurrenceId: input.occurrenceId,
    recipientId: input.olderAdultUserId,
    channel: "voice",
    direction: "inbound",
    providerReference: input.providerReference,
    status: "delivered",
    attemptNumber: 1,
    errorCode: null,
    idempotencyKey,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  if (input.keypad === "3") {
    return { ok: true, action: "replayed" };
  }

  if (input.keypad === "1") {
    await acknowledgeOccurrence(
      {
        routines: deps.routines,
        occurrences: deps.occurrences,
        careCircles: deps.careCircles,
        audit: deps.audit,
        clock: deps.clock,
        idGenerator: deps.idGenerator,
      } as AcknowledgeOccurrenceDeps,
      {
        occurrenceId: input.occurrenceId,
        actorUserId: input.olderAdultUserId,
        channel: "voice_keypad",
      },
    );
    return { ok: true, action: "acknowledged" };
  }

  await raiseDirectHelpAlert(
    {
      careCircles: deps.careCircles,
      alerts: deps.alerts,
      audit: deps.audit,
      communications: deps.communications,
      notificationGateway: deps.notificationGateway,
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    } as RaiseDirectHelpAlertDeps,
    { olderAdultUserId: input.olderAdultUserId },
  );
  return { ok: true, action: "help_requested" };
}
