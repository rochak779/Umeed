// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAlertsRealtime } from "./useAlertsRealtime";

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};
const mockClient = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock("@/infrastructure/supabase/authClient", () => ({
  getSupabaseAuthClient: () => mockClient,
}));

describe("useAlertsRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["DATA_ADAPTER"] = "supabase";
  });

  it("does nothing when there is no active circle", () => {
    renderHook(() => useAlertsRealtime(undefined, vi.fn()));
    expect(mockClient.channel).not.toHaveBeenCalled();
  });

  it("does nothing in local mode even with a circle id", () => {
    process.env["DATA_ADAPTER"] = "local";
    renderHook(() => useAlertsRealtime("circle-1", vi.fn()));
    expect(mockClient.channel).not.toHaveBeenCalled();
  });

  it("subscribes to the circle's alerts channel and wires onChange to postgres_changes", () => {
    const onChange = vi.fn();
    renderHook(() => useAlertsRealtime("circle-1", onChange));

    expect(mockClient.channel).toHaveBeenCalledWith("alerts:circle-1");
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "alerts",
        filter: "care_circle_id=eq.circle-1",
      }),
      expect.any(Function),
    );

    const changeHandler = mockChannel.on.mock.calls[0]![2];
    changeHandler();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() => useAlertsRealtime("circle-1", vi.fn()));
    unmount();
    expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
