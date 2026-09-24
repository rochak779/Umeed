/** IdGenerator abstraction (Implementation.md §11.1). Never construct ids inline in domain code. */
export interface IdGenerator {
  nextId(): string;
}

/** UUID-shaped ids for normal application use and local/Supabase persistence. */
export class UuidIdGenerator implements IdGenerator {
  nextId(): string {
    return crypto.randomUUID();
  }
}

/** Deterministic, ordered ids for tests and fixtures only. */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix: string) {}

  nextId(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}
