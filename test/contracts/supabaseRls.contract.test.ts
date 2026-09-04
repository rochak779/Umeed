import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createSupabaseServiceClient,
  createSupabaseAnonClient,
} from "@/infrastructure/supabase/client";
import { createTestAuthUser, deleteTestAuthUser } from "../infrastructure/supabase/testAuthUsers";

// Phase 8's release gate requires `bun run test` to pass with no Supabase
// dependency configured. createSupabaseServiceClient() throws when
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are missing, so this whole suite
// must be skipped — not merely fail — on a fresh clone or CI without
// secrets. Guard both the env check and the client construction: even a
// skipped describe body is still evaluated by Vitest to discover its
// `it()`s, so the throwing call must never run unconditionally at module
// scope.
const hasSupabaseEnv =
  Boolean(process.env["SUPABASE_URL"]) && Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
const service = hasSupabaseEnv ? createSupabaseServiceClient() : undefined!;

async function signInAs(userId: string, email: string) {
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error("failed to generate test session");
  // Exchange for a real session via verifyOtp using the admin-issued token.
  const anon = createSupabaseAnonClient();
  const { data: session, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError || !session.session) throw new Error("failed to exchange test session");
  return createSupabaseAnonClient(session.session.access_token);
}

describe.skipIf(!hasSupabaseEnv)("RLS negative cases", () => {
  const cleanupUserIds: string[] = [];
  // signInAs must be called with the exact email each auth user was
  // registered under — generateLink({type:"magiclink", email}) for an
  // email that doesn't match any existing auth.users row implicitly
  // creates a brand-new shadow user, and verifying a magic link for a
  // just-created user immediately hits a Supabase consistency-lag edge
  // case (verifyOtp fails with otp_expired even though the link is
  // fresh). Tracking id -> registration email here keeps every signInAs
  // call pointed at the user that was actually created in beforeAll.
  const emailById = new Map<string, string>();
  let coordinatorId: string,
    nearbyResponderId: string,
    outsiderId: string,
    circleId: string,
    memberPermissionId: string;

  beforeAll(async () => {
    const coordinatorEmail = `coord-${crypto.randomUUID()}@example.invalid`;
    const nearbyEmail = `nearby-${crypto.randomUUID()}@example.invalid`;
    const outsiderEmail = `outsider-${crypto.randomUUID()}@example.invalid`;
    const coordinator = await createTestAuthUser(coordinatorEmail);
    const nearby = await createTestAuthUser(nearbyEmail);
    const outsider = await createTestAuthUser(outsiderEmail);
    coordinatorId = coordinator.id;
    nearbyResponderId = nearby.id;
    outsiderId = outsider.id;
    cleanupUserIds.push(coordinatorId, nearbyResponderId, outsiderId);
    emailById.set(coordinatorId, coordinatorEmail);
    emailById.set(nearbyResponderId, nearbyEmail);
    emailById.set(outsiderId, outsiderEmail);

    for (const id of [coordinatorId, nearbyResponderId, outsiderId]) {
      await service.from("profiles").insert({
        id,
        display_name: "Test",
        preferred_name: "Test",
        email: emailById.get(id)!,
        timezone: "Europe/London",
        locale: "en-GB",
        accessibility_large_text: false,
        accessibility_reduced_motion: false,
        accessibility_high_contrast: false,
        onboarding_status: "complete",
      });
    }

    const circle = await service
      .from("care_circles")
      .insert({
        id: crypto.randomUUID(),
        name: "Test circle",
        coordinator_id: coordinatorId,
        status: "active",
      })
      .select("id")
      .single();
    circleId = circle.data!.id;

    const nearbyMember = await service
      .from("circle_members")
      .insert({
        id: crypto.randomUUID(),
        care_circle_id: circleId,
        user_id: nearbyResponderId,
        relationship: "neighbour",
        responder_type: "nearby_responder",
        is_nearby: true,
        priority: 1,
        preferred_channel: "sms",
        membership_status: "active",
      })
      .select("id")
      .single();

    const permission = await service
      .from("member_permissions")
      .insert({
        id: crypto.randomUUID(),
        circle_member_id: nearbyMember.data!.id,
        can_view_routine_status: true,
        can_view_medication_labels: false,
        can_view_notes: false,
        can_view_address: false,
        can_receive_alerts: true,
      })
      .select("id")
      .single();
    memberPermissionId = permission.data!.id;

    // A real row to isolate against — without one, the cross-circle test
    // below would pass trivially on an empty table and prove nothing.
    await service.from("alerts").insert({
      id: crypto.randomUUID(),
      care_circle_id: circleId,
      source: "direct_help",
      status: "open",
      severity: "urgent",
    });
  });

  afterAll(async () => {
    await service.from("care_circles").delete().eq("id", circleId);
    for (const id of cleanupUserIds) {
      await service.from("profiles").delete().eq("id", id);
      await deleteTestAuthUser(id);
    }
  });

  it("nearby responder cannot view medication label via can_view_medication_labels flag", async () => {
    const nearbyClient = await signInAs(nearbyResponderId, emailById.get(nearbyResponderId)!);
    const { data } = await nearbyClient
      .from("member_permissions")
      .select("can_view_medication_labels")
      .eq("id", memberPermissionId)
      .maybeSingle();
    expect(data?.can_view_medication_labels).toBe(false);
  });

  it("removed member cannot read the circle after removal", async () => {
    await service.from("circle_members").insert({
      id: crypto.randomUUID(),
      care_circle_id: circleId,
      user_id: outsiderId,
      relationship: "friend",
      responder_type: "family",
      is_nearby: false,
      priority: 2,
      preferred_channel: "email",
      membership_status: "removed",
    });
    const removedClient = await signInAs(outsiderId, emailById.get(outsiderId)!);
    const { data, error } = await removedClient.from("care_circles").select("*").eq("id", circleId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a user from another circle cannot read this circle's alerts", async () => {
    const otherEmail = `other-${crypto.randomUUID()}@example.invalid`;
    const otherUser = await createTestAuthUser(otherEmail);
    cleanupUserIds.push(otherUser.id);
    emailById.set(otherUser.id, otherEmail);
    await service.from("profiles").insert({
      id: otherUser.id,
      display_name: "Other",
      preferred_name: "Other",
      email: otherEmail,
      timezone: "Europe/London",
      locale: "en-GB",
      accessibility_large_text: false,
      accessibility_reduced_motion: false,
      accessibility_high_contrast: false,
      onboarding_status: "complete",
    });
    const otherClient = await signInAs(otherUser.id, otherEmail);
    const { data, error } = await otherClient
      .from("alerts")
      .select("*")
      .eq("care_circle_id", circleId);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Sanity check: the row genuinely exists and is visible to a member of
    // the circle — otherwise the assertion above would pass trivially on
    // an empty or universally-blocked table and prove nothing about RLS.
    const nearbyClient = await signInAs(nearbyResponderId, emailById.get(nearbyResponderId)!);
    const { data: visibleToMember } = await nearbyClient
      .from("alerts")
      .select("*")
      .eq("care_circle_id", circleId);
    expect(visibleToMember).not.toEqual([]);
  });

  it("authenticated clients cannot insert audit events directly (service-role only)", async () => {
    const nearbyClient = await signInAs(nearbyResponderId, emailById.get(nearbyResponderId)!);
    const { error } = await nearbyClient.from("audit_events").insert({
      id: crypto.randomUUID(),
      care_circle_id: circleId,
      actor_id: nearbyResponderId,
      actor_type: "user",
      action: "test",
      entity_type: "test",
      entity_id: "test",
    });
    // Must fail specifically because RLS has no insert policy for
    // authenticated/anon on audit_events (Task 3), not because of a
    // missing required field — id is supplied above so that's ruled out.
    expect(error).not.toBeNull();
  });
});
