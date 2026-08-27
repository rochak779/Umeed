import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "../../application/ports/infra";
import type { CareCircle, CircleMember } from "../../domain/entities/careCircle";
import type { UserProfile } from "../../domain/entities/profile";
import { container } from "./container";

export type ActiveMembership = { circle: CareCircle; member: CircleMember };

type SessionState = {
  loading: boolean;
  session: Session | null;
  profile: UserProfile | null;
  /** Every active circle this account belongs to, with this account's membership in it. */
  memberships: ActiveMembership[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<SessionState | null>(null);

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
    setMemberships(withMembers.filter((m): m is ActiveMembership => m !== null));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return container.authProvider.onSessionChange(() => {
      void load();
    });
  }, []);

  const signOut = async () => {
    await container.authProvider.signOut();
  };

  return (
    <SessionCtx.Provider value={{ loading, session, profile, memberships, refresh: load, signOut }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
