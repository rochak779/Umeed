// NOTE: this function and the src/ files it transitively imports (29 of
// them — application use-cases/ports, domain entities/services/policies/
// state-machines, the Supabase repository adapters and mappers,
// MockNotificationGateway, Clock, IdGenerator) use explicit `.ts` extensions
// on their relative/alias imports, unlike the rest of src/. That's
// intentional: Deno's module resolver, unlike Vite/tsc's "Bundler" mode,
// does not probe for extensionless local specifiers, so these imports must
// carry the extension to be importable here. If you edit one of those
// files, keep its import extensions — this is deliberate Deno-compat
// infrastructure, not stylistic drift to be "cleaned up".
import { createClient } from "jsr:@supabase/supabase-js@2";
import { pollDueWork } from "../../../src/application/use-cases/pollDueWork.ts";
import { SystemClock } from "../../../src/shared/time/Clock.ts";
import { UuidIdGenerator } from "../../../src/shared/id/IdGenerator.ts";
import { SupabaseRoutineRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseRoutineRepository.ts";
import { SupabaseOccurrenceRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseOccurrenceRepository.ts";
import { SupabaseCareCircleRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseCareCircleRepository.ts";
import { SupabaseAlertRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseAlertRepository.ts";
import { SupabaseAuditRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseAuditRepository.ts";
import { SupabaseCommunicationRepository } from "../../../src/infrastructure/supabase/repositories/SupabaseCommunicationRepository.ts";
import { MockNotificationGateway } from "../../../src/infrastructure/mock-communications/MockNotificationGateway.ts";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const careCircles = new SupabaseCareCircleRepository(client);
  const deps = {
    routines: new SupabaseRoutineRepository(client),
    occurrences: new SupabaseOccurrenceRepository(client),
    careCircles,
    alerts: new SupabaseAlertRepository(client),
    audit: new SupabaseAuditRepository(client),
    communications: new SupabaseCommunicationRepository(client),
    notificationGateway: new MockNotificationGateway(clock, idGenerator),
    clock,
    idGenerator,
  };

  try {
    const activeCircles = await careCircles.findAllActive();
    const result = await pollDueWork(deps, { careCircleIds: activeCircles.map((c) => c.id) });
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    // Redacted the same way analytics events already are (Implementation.md
    // §15): log the error's message/stack only, never the full care-circle
    // or occurrence payload it might have been operating on when it threw.
    console.error("poll-due-work failed:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
