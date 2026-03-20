/** Lightweight typed event bus for cross-domain communication. */

type Listener<T = unknown> = (payload: T) => void;

export class EventBus {
  readonly #listeners = new Map<string, Set<Listener>>();

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    const set = this.#listeners.get(event)!;
    set.add(listener as Listener);
    return () => set.delete(listener as Listener);
  }

  emit<T = unknown>(event: string, payload: T): void {
    const set = this.#listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(payload);
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
