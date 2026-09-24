import { describe, expect, it } from "vitest";
import { z } from "zod";
import { InMemoryKeyValueStore } from "./KeyValueStore";
import { LocalCollection } from "./LocalCollection";

const ItemSchema = z.object({ id: z.string(), name: z.string() });
type Item = z.infer<typeof ItemSchema>;

function makeCollection(store = new InMemoryKeyValueStore()) {
  return { store, collection: new LocalCollection<Item>(store, "items", ItemSchema, 1) };
}

describe("LocalCollection", () => {
  it("starts empty", () => {
    const { collection } = makeCollection();
    expect(collection.all()).toEqual([]);
  });

  it("saves and reads back an item by id", () => {
    const { collection } = makeCollection();
    collection.save({ id: "a", name: "Alpha" });
    expect(collection.findById("a")).toEqual({ id: "a", name: "Alpha" });
  });

  it("upserts: saving the same id twice replaces it", () => {
    const { collection } = makeCollection();
    collection.save({ id: "a", name: "Alpha" });
    collection.save({ id: "a", name: "Alpha 2" });
    expect(collection.all()).toHaveLength(1);
    expect(collection.findById("a")?.name).toBe("Alpha 2");
  });

  it("survives being reloaded from the same underlying store", () => {
    const store = new InMemoryKeyValueStore();
    const first = new LocalCollection<Item>(store, "items", ItemSchema, 1);
    first.save({ id: "a", name: "Alpha" });

    const second = new LocalCollection<Item>(store, "items", ItemSchema, 1);
    expect(second.findById("a")).toEqual({ id: "a", name: "Alpha" });
  });

  it("safely resets when the stored data fails schema validation", () => {
    const store = new InMemoryKeyValueStore();
    store.set("items", JSON.stringify({ version: 1, items: [{ id: "a" }] })); // missing `name`
    const collection = new LocalCollection<Item>(store, "items", ItemSchema, 1);
    expect(collection.all()).toEqual([]);
  });

  it("safely resets when the stored version does not match", () => {
    const store = new InMemoryKeyValueStore();
    store.set("items", JSON.stringify({ version: 999, items: [{ id: "a", name: "Alpha" }] }));
    const collection = new LocalCollection<Item>(store, "items", ItemSchema, 1);
    expect(collection.all()).toEqual([]);
  });

  it("safely resets on malformed JSON", () => {
    const store = new InMemoryKeyValueStore();
    store.set("items", "not json{{{");
    const collection = new LocalCollection<Item>(store, "items", ItemSchema, 1);
    expect(collection.all()).toEqual([]);
  });
});
