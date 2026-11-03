// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("./sessionApi", () => ({
  api: { session: { load: vi.fn(async () => Promise.reject(new Error("Supabase is down"))) } },
}));

import { SessionProvider, useSession } from "./SessionContext";

describe("SessionProvider", () => {
  it("stops loading and treats the user as signed out when the session load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.memberships).toEqual([]);
  });
});
