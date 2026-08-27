import type { DomainEvent, EventBus } from "../../application/ports/infra";

/** In-process pub/sub used to publish local writes to open views (Implementation.md §11.2). */
export class LocalEventBus implements EventBus {
  private handlers = new Map<string, Set<(event: DomainEvent) => void>>();

  publish(event: DomainEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) {
      handler(event);
    }
  }

  subscribe(type: string, handler: (event: DomainEvent) => void): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }
}
