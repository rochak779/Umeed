import { z, type ZodType } from "zod";
import type { KeyValueStore } from "./KeyValueStore";

/**
 * A single versioned, schema-validated collection of records with an `id`
 * field, backed by a KeyValueStore (Implementation.md §11.2). Invalid or
 * version-mismatched stored data is safely reset rather than crashing the
 * app or use case that reads it.
 */
export class LocalCollection<T extends { id: string }> {
  private readonly envelopeSchema;

  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
    private readonly schema: ZodType<T>,
    private readonly version: number,
  ) {
    this.envelopeSchema = z.object({ version: z.number(), items: z.array(schema) });
  }

  all(): T[] {
    const raw = this.store.get(this.key);
    if (raw === null) return [];

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return [];
    }

    const envelope = this.envelopeSchema.safeParse(parsedJson);
    if (!envelope.success) return [];
    if (envelope.data.version !== this.version) return [];

    return envelope.data.items;
  }

  findById(id: string): T | null {
    return this.all().find((item) => item.id === id) ?? null;
  }

  save(item: T): void {
    const items = this.all().filter((existing) => existing.id !== item.id);
    items.push(item);
    this.writeAll(items);
  }

  private writeAll(items: T[]): void {
    this.store.set(this.key, JSON.stringify({ version: this.version, items }));
  }
}
