import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "../../application/ports/infra";
import type { CareCircle, CircleMember } from "../../domain/entities/careCircle";
import type { UserProfile } from "../../domain/entities/profile";
import { container } from "./container";

export type ActiveMembership = { circle: CareCircle; member: CircleMember };

const ACTIVE_CIRCLE_STORAGE_KEY = "umeed.active_circle_id";

type SessionState = {
  loading: boolean;
  session: Session | null;
  profile: UserProfile | null;
  /** Every active circle this account belongs to, with this account's membership in it. */
  memberships: ActiveMembership[];
  /**
   * Which care circle is currently being viewed. This is purely a display
   * preference for multi-circle accounts — which circle's data is shown —
   * and must never be confused with a role switcher (Implementation.md
   * §7.2: role/navigation comes from membership, never a client-controlled
   * dropdown). A user's role is still derived from their membership record
   * in whichever circle is active, not chosen here.
   */
  activeCircleId: string | null;
  setActiveCircleId: (id: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<SessionState | null>(null);

/**
 * Pure resolution of "which membership is currently active" — given the
 * account's memberships and the currently-selected circle id, returns the
 * matching membership, falling back to the first membership when the
 * selected id is null or no longer present (e.g. access was revoked).
 * Kept as a standalone export so it can be unit-tested without rendering
 * React.
 */
export function resolveActiveMembership(
  memberships: ActiveMembership[],
  activeCircleId: string | null,
): ActiveMembership | undefined {
  return memberships.find((m) => m.circle.id === activeCircleId) ?? memberships[0];
}

/**
 * Loads the current session, profile and active care-circle memberships from
 * the local adapters (Implementation.md §7.2: role/navigation comes from
 * membership, never a client-controlled dropdown). Runs client-side only —
 * see the "known limitation" note on the route guard for why.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [activeCircleId, setActiveCircleIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_CIRCLE_STORAGE_KEY);
  });

  const setActiveCircleId = (id: string) => {
    setActiveCircleIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_CIRCLE_STORAGE_KEY, id);
    }
  };

  const load = async () => {
    const currentSession = await container.authProvider.getSession();
    setSession(currentSession);
    if (!currentSession) {
      setProfile(null);
      setMemberships([]);
      setLoading(false);
      return;
    }
    const [loadedProfile, circles] = await Promise.all([
      container.profileRepository.findById(currentSession.userId),
      container.careCircleRepository.findByUserId(currentSession.userId),
    ]);
    setProfile(loadedProfile);
    const withMembers = await Promise.all(
      circles.map(async (circle) => {
        const member = await container.careCircleRepository.findMemberByUserAndCircle(
          currentSession.userId,
          circle.id,
        );
        return member ? { circle, member } : null;
      }),
    );
    const loadedMemberships = withMembers.filter((m): m is ActiveMembership => m !== null);
    setMemberships(loadedMemberships);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return container.authProvider.onSessionChange(() => {
      void load();
    });
  }, []);

  // Default (or repair) the active circle whenever memberships change: if
  // nothing is selected yet, or the previously-selected circle is no longer
  // one this account belongs to, fall back to the first membership.
  useEffect(() => {
    if (memberships.length === 0) return;
    const stillValid = memberships.some((m) => m.circle.id === activeCircleId);
    if (activeCircleId === null || !stillValid) {
      const fallback = memberships[0]?.circle.id ?? null;
      setActiveCircleIdState(fallback);
      if (typeof window !== "undefined" && fallback) {
        window.localStorage.setItem(ACTIVE_CIRCLE_STORAGE_KEY, fallback);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships]);

  const signOut = async () => {
    await container.authProvider.signOut();
  };

  return (
    <SessionCtx.Provider
      value={{
        loading,
        session,
        profile,
        memberships,
        activeCircleId,
        setActiveCircleId,
        refresh: load,
        signOut,
      }}
    >
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
