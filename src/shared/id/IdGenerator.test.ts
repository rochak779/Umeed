import { describe, expect, it } from "vitest";
import { SequentialIdGenerator, UuidIdGenerator } from "./IdGenerator";

describe("UuidIdGenerator", () => {
  it("generates distinct UUID-shaped ids", () => {
    const gen = new UuidIdGenerator();
    const a = gen.nextId();
    const b = gen.nextId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("SequentialIdGenerator", () => {
  it("produces deterministic, ordered ids for tests", () => {
    const gen = new SequentialIdGenerator("routine");
    expect(gen.nextId()).toBe("routine-1");
    expect(gen.nextId()).toBe("routine-2");
  });
});
