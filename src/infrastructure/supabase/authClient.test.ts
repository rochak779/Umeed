import { describe, expect, it, vi } from "vitest";
import { toCookieMethods } from "./authClient";

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
