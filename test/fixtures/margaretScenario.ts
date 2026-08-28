/**
 * The Implementation.md §5 reference scenario, built as synthetic fixture
 * data for automated tests only (never hard-coded into product components,
 * never exposed via a scenario launcher in the UI).
 *
 * Margaret (older adult, London) has a 9:00am "Morning check-in and
 * tablets" routine. Sarah (daughter, coordinator) and Daniel (son) are
 * family members. Priya (neighbour) is the first nearby responder.
 */
import { InMemoryKeyValueStore } from "../../src/infrastructure/local/KeyValueStore";
import { LocalProfileRepository } from "../../src/infrastructure/local/repositories/LocalProfileRepository";
import { LocalCareCircleRepository } from "../../src/infrastructure/local/repositories/LocalCareCircleRepository";
import { LocalRoutineRepository } from "../../src/infrastructure/local/repositories/LocalRoutineRepository";
import { LocalOccurrenceRepository } from "../../src/infrastructure/local/repositories/LocalOccurrenceRepository";
import { LocalAlertRepository } from "../../src/infrastructure/local/repositories/LocalAlertRepository";
import { LocalConsentRepository } from "../../src/infrastructure/local/repositories/LocalConsentRepository";
import { LocalAuditRepository } from "../../src/infrastructure/local/repositories/LocalAuditRepository";
import { LocalInvitationRepository } from "../../src/infrastructure/local/repositories/LocalInvitationRepository";
import {
  buildCareCircle,
  buildCircleMember,
  buildEscalationPolicy,
  buildMemberPermission,
  buildRoutine,
  buildUserProfile,
} from "../builders/entities";

export function buildMargaretScenarioRepositories() {
  const store = new InMemoryKeyValueStore();

  const profiles = new LocalProfileRepository(store);
  const careCircles = new LocalCareCircleRepository(store);
  const routines = new LocalRoutineRepository(store);
  const occurrences = new LocalOccurrenceRepository(store);
  const alerts = new LocalAlertRepository(store);
  const consents = new LocalConsentRepository(store);
  const audit = new LocalAuditRepository(store);
  const invitations = new LocalInvitationRepository(store);

  return {
    store,
    profiles,
    careCircles,
    routines,
    occurrences,
    alerts,
    consents,
    audit,
    invitations,
  };
}

export async function seedMargaretScenario(
  repos: ReturnType<typeof buildMargaretScenarioRepositories>,
) {
  const margaret = buildUserProfile({
    id: "margaret",
    displayName: "Margaret",
    preferredName: "Margaret",
    email: "margaret@example.com",
  });
  const sarah = buildUserProfile({
    id: "sarah",
    displayName: "Sarah",
    preferredName: "Sarah",
    email: "sarah@example.com",
  });
  const daniel = buildUserProfile({
    id: "daniel",
    displayName: "Daniel",
    preferredName: "Daniel",
    email: "daniel@example.com",
  });
  const priya = buildUserProfile({
    id: "priya",
    displayName: "Priya",
    preferredName: "Priya",
    email: "priya@example.com",
  });
  for (const profile of [margaret, sarah, daniel, priya]) {
    await repos.profiles.save(profile);
  }

  const circle = buildCareCircle({
    id: "circle-margaret",
    name: "Margaret's circle",
    olderAdultId: "margaret",
    coordinatorId: "sarah",
  });
  await repos.careCircles.save(circle);

  const margaretMember = buildCircleMember({
    id: "member-margaret",
    careCircleId: circle.id,
    userId: "margaret",
    relationship: "self",
    responderType: "older_adult",
  });
  const sarahMember = buildCircleMember({
    id: "member-sarah",
    careCircleId: circle.id,
    userId: "sarah",
    relationship: "daughter",
    responderType: "coordinator",
    priority: 1,
  });
  const danielMember = buildCircleMember({
    id: "member-daniel",
    careCircleId: circle.id,
    userId: "daniel",
    relationship: "son",
    responderType: "family",
    priority: 2,
  });
  const priyaMember = buildCircleMember({
    id: "member-priya",
    careCircleId: circle.id,
    userId: "priya",
    relationship: "neighbour",
    responderType: "nearby_responder",
    isNearby: true,
    priority: 0,
  });
  for (const member of [margaretMember, sarahMember, danielMember, priyaMember]) {
    await repos.careCircles.saveMember(member);
    await repos.careCircles.savePermission(buildMemberPermission(member.id, member.responderType));
  }

  const routine = buildRoutine({
    id: "routine-morning",
    careCircleId: circle.id,
    olderAdultId: "margaret",
    title: "Morning check-in and tablets",
    localTime: "09:00",
  });
  await repos.routines.save(routine);
  await repos.routines.saveEscalationPolicy(
    buildEscalationPolicy({ id: `policy-${routine.id}`, routineId: routine.id }),
  );

  return {
    margaret,
    sarah,
    daniel,
    priya,
    circle,
    routine,
    members: { margaretMember, sarahMember, danielMember, priyaMember },
  };
}
