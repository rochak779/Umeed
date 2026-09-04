import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { toCookieMethods } from "./authClient";

// Mock @supabase/ssr at the top level
let mockServerClientInstances: Record<string, unknown>[] = [];
let mockBrowserClientInstance: Record<string, unknown> | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => {
    const instance = { id: `server-client-${mockServerClientInstances.length + 1}` };
    mockServerClientInstances.push(instance);
    return instance;
  }),
  createBrowserClient: vi.fn(() => {
    if (!mockBrowserClientInstance) {
      mockBrowserClientInstance = { id: "browser-client-instance" };
    }
    return mockBrowserClientInstance;
  }),
}));

describe("toCookieMethods", () => {
  it("maps a plain cookie record into the {name,value}[] shape @supabase/ssr expects", () => {
    const read = () => ({ "sb-access-token": "abc", "sb-refresh-token": "def" });
    const write = vi.fn();
    const bridge = toCookieMethods(read, write);

    expect(bridge.getAll()).toEqual([
      { name: "sb-access-token", value: "abc" },
      { name: "sb-refresh-token", value: "def" },
    ]);
  });

  it("forwards each cookie in setAll to the write function with its options", () => {
    const write = vi.fn();
    const bridge = toCookieMethods(() => ({}), write);

    bridge.setAll([
      { name: "sb-access-token", value: "new-value", options: { maxAge: 3600 } },
      { name: "sb-refresh-token", value: "", options: { maxAge: 0 } },
    ]);

    expect(write).toHaveBeenNthCalledWith(1, "sb-access-token", "new-value", { maxAge: 3600 });
    expect(write).toHaveBeenNthCalledWith(2, "sb-refresh-token", "", { maxAge: 0 });
  });
});

describe("getSupabaseAuthClient", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    mockServerClientInstances = [];
    mockBrowserClientInstance = undefined;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("calls createServerClient fresh on each invocation (no per-module cache)", async () => {
    // Dynamic import to get fresh module state
    const { getSupabaseAuthClient } = await import("./authClient");

    const client1 = getSupabaseAuthClient();
    const client2 = getSupabaseAuthClient();

    // In server mode (Node.js test environment), each call should produce a distinct
    // object from createServerClient — no caching at module scope
    expect(client1).not.toBe(client2);
    expect(mockServerClientInstances).toHaveLength(2);
    expect(mockServerClientInstances[0].id).toBe("server-client-1");
    expect(mockServerClientInstances[1].id).toBe("server-client-2");
  });
});
