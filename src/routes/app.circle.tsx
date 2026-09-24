import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Ban, LogOut, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Screen, TopBar, UButton, UCard } from "@/components/umeed/primitives";
import { Field } from "@/shared/components/Field";
import { container } from "@/features/authentication/container";
import { resolveActiveMembership, useSession } from "@/features/authentication/SessionContext";
import {
  getCircleRoster,
  type GetCircleRosterResult,
} from "@/application/use-cases/getCircleRoster";
import { inviteMember } from "@/application/use-cases/inviteMember";
import { reorderMemberPriority } from "@/application/use-cases/reorderMemberPriority";
import { revokeMemberPermission } from "@/application/use-cases/revokeMemberPermission";
import { setCareCirclePaused } from "@/application/use-cases/setCareCirclePaused";
import { requestLeaveCircle } from "@/application/use-cases/requestLeaveCircle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ResponderType } from "@/domain/entities/careCircle";

export const Route = createFileRoute("/app/circle")({
  head: () => ({ meta: [{ title: "Care circle — Umeed" }] }),
  component: CircleScreen,
});

const roleLabel: Record<ResponderType, string> = {
  older_adult: "Older adult",
  coordinator: "Coordinator",
  family: "Family member",
  nearby_responder: "Nearby responder",
};

function CircleScreen() {
  const { session, memberships, activeCircleId } = useSession();
  const navigate = useNavigate();
  const membership = resolveActiveMembership(memberships, activeCircleId);
  const circleId = membership?.circle.id;
  const [roster, setRoster] = useState<GetCircleRosterResult | null>(null);
  const [circleStatus, setCircleStatus] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("");
  const [inviteType, setInviteType] = useState<"family" | "nearby_responder">("family");
  const [leaving, setLeaving] = useState(false);

  const load = async () => {
    if (!session || !circleId) return;
    const result = await getCircleRoster(
      { careCircles: container.careCircleRepository, profiles: container.profileRepository },
      { careCircleId: circleId, actorUserId: session.userId },
    );
    setRoster(result);
    const circle = await container.careCircleRepository.findById(circleId);
    setCircleStatus(circle?.status ?? null);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, circleId]);

  if (!roster || !session || !circleId) {
    return (
      <>
        <TopBar title="Care circle" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">Loading…</p>
        </Screen>
      </>
    );
  }

  if (!roster.ok) {
    return (
      <>
        <TopBar title="Care circle" back="/app" />
        <Screen>
          <p className="t-body text-text-soft">You don't have access to this circle.</p>
        </Screen>
      </>
    );
  }

  if (roster.view.kind === "minimal") {
    const canLeave =
      roster.view.actorRole === "family" || roster.view.actorRole === "nearby_responder";
    return (
      <>
        <TopBar title="Care circle" back="/app" />
        <Screen>
          <UCard className="space-y-1">
            <p className="t-body text-text">
              You're a {roleLabel[roster.view.actorRole].toLowerCase()} for{" "}
              <strong>{roster.view.olderAdultPreferredName}</strong>.
            </p>
            <p className="t-caption text-text-soft">
              Only the coordinator can see the full circle and manage members.
            </p>
          </UCard>

          {canLeave ? (
            <>
              <UButton variant="secondary" size="lg" full onClick={() => setLeaving(true)}>
                <LogOut aria-hidden size={18} /> Leave this circle
              </UButton>
              <AlertDialog open={leaving} onOpenChange={setLeaving}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave this care circle?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll no longer see routines, alerts, or updates for{" "}
                      {roster.view.olderAdultPreferredName}. Someone in the circle can invite you
                      back later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!session || !circleId) return;
                        await requestLeaveCircle(
                          {
                            careCircles: container.careCircleRepository,
                            audit: container.auditRepository,
                            clock: container.clock,
                            idGenerator: container.idGenerator,
                          },
                          { careCircleId: circleId, userId: session.userId },
                        );
                        toast.success("You've left the circle");
                        navigate({ to: "/app" });
                      }}
                    >
                      Leave circle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Care circle" back="/app" />
      <Screen>
        <UCard className="flex items-center justify-between gap-2">
          <div>
            <p className="t-card-title font-semibold text-text">Circle status</p>
            <p className="t-caption text-text-soft">
              {circleStatus === "paused"
                ? "Paused — routines and alerts are on hold"
                : circleStatus === "pending_consent"
                  ? "Waiting for consent — reminders aren't active yet"
                  : "Active"}
            </p>
          </div>
          {circleStatus === "active" || circleStatus === "paused" ? (
            <UButton
              variant="secondary"
              size="md"
              onClick={async () => {
                if (!session || !circleId) return;
                await setCareCirclePaused(
                  {
                    careCircles: container.careCircleRepository,
                    audit: container.auditRepository,
                    clock: container.clock,
                    idGenerator: container.idGenerator,
                  },
                  {
                    careCircleId: circleId,
                    actorUserId: session.userId,
                    paused: circleStatus !== "paused",
                  },
                );
                await load();
              }}
            >
              {circleStatus === "paused" ? "Resume circle" : "Pause circle"}
            </UButton>
          ) : null}
        </UCard>

        {roster.view.members.length === 0 ? (
          <p className="t-body text-text-soft">No members in this circle yet.</p>
        ) : null}
        {roster.view.members.map((m) => (
          <UCard key={m.circleMemberId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="t-card-title font-semibold text-text">{roleLabel[m.responderType]}</p>
                <p className="t-caption text-text-soft">
                  {m.relationship}
                  {m.isNearby ? " · nearby" : ""}
                </p>
              </div>
              {m.userId !== session.userId ? (
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Move up in escalation order"
                    className="flex size-11 items-center justify-center rounded-full text-text-soft"
                    onClick={async () => {
                      await reorderMemberPriority(
                        {
                          careCircles: container.careCircleRepository,
                          audit: container.auditRepository,
                          clock: container.clock,
                          idGenerator: container.idGenerator,
                        },
                        {
                          careCircleId: circleId,
                          actorUserId: session.userId,
                          circleMemberId: m.circleMemberId,
                          newPriority: Math.max(0, m.priority - 1),
                        },
                      );
                      await load();
                    }}
                  >
                    <ArrowUp aria-hidden size={18} />
                  </button>
                  <button
                    aria-label="Move down in escalation order"
                    className="flex size-11 items-center justify-center rounded-full text-text-soft"
                    onClick={async () => {
                      await reorderMemberPriority(
                        {
                          careCircles: container.careCircleRepository,
                          audit: container.auditRepository,
                          clock: container.clock,
                          idGenerator: container.idGenerator,
                        },
                        {
                          careCircleId: circleId,
                          actorUserId: session.userId,
                          circleMemberId: m.circleMemberId,
                          newPriority: m.priority + 1,
                        },
                      );
                      await load();
                    }}
                  >
                    <ArrowDown aria-hidden size={18} />
                  </button>
                  <button
                    aria-label="Revoke access"
                    className="flex size-11 items-center justify-center rounded-full text-critical"
                    onClick={async () => {
                      await revokeMemberPermission(
                        {
                          careCircles: container.careCircleRepository,
                          audit: container.auditRepository,
                          clock: container.clock,
                          idGenerator: container.idGenerator,
                        },
                        {
                          careCircleId: circleId,
                          actorUserId: session.userId,
                          circleMemberId: m.circleMemberId,
                        },
                      );
                      toast.success("Access revoked");
                      await load();
                    }}
                  >
                    <Ban aria-hidden size={18} />
                  </button>
                </div>
              ) : null}
            </div>
            <p className="t-caption text-text-soft">
              Priority {m.priority} · {m.canViewMedicationLabels ? "Can" : "Cannot"} view medication
              labels · {m.canViewNotes ? "Can" : "Cannot"} view notes
            </p>
          </UCard>
        ))}

        {inviting ? (
          <UCard>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await inviteMember(
                  {
                    careCircles: container.careCircleRepository,
                    invitations: container.invitationRepository,
                    audit: container.auditRepository,
                    clock: container.clock,
                    idGenerator: container.idGenerator,
                  },
                  {
                    careCircleId: circleId,
                    actorUserId: session.userId,
                    invitedEmail: inviteEmail,
                    invitedPhone: null,
                    proposedResponderType: inviteType,
                    proposedRelationship: inviteRelationship || inviteType,
                  },
                );
                const link = `${window.location.origin}/invite/${result.plaintextToken}`;
                await navigator.clipboard.writeText(link);
                toast.success("Invite link copied");
                setInviting(false);
                setInviteEmail("");
                setInviteRelationship("");
              }}
            >
              <div className="flex gap-2">
                <UButton
                  type="button"
                  size="md"
                  variant={inviteType === "family" ? "primary" : "secondary"}
                  onClick={() => setInviteType("family")}
                >
                  Family member
                </UButton>
                <UButton
                  type="button"
                  size="md"
                  variant={inviteType === "nearby_responder" ? "primary" : "secondary"}
                  onClick={() => setInviteType("nearby_responder")}
                >
                  Nearby responder
                </UButton>
              </div>
              <Field
                id="inviteRelationship"
                label="Relationship"
                placeholder={inviteType === "family" ? "Son, sister…" : "Neighbour, friend…"}
                value={inviteRelationship}
                onChange={(e) => setInviteRelationship(e.target.value)}
              />
              <Field
                id="inviteEmail"
                label="Their email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <UButton type="submit" size="lg" full>
                Send invite
              </UButton>
            </form>
          </UCard>
        ) : (
          <UButton variant="secondary" size="lg" full onClick={() => setInviting(true)}>
            <UserPlus aria-hidden size={18} /> Invite someone
          </UButton>
        )}
      </Screen>
    </>
  );
}
