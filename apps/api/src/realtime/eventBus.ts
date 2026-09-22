import type { DomainEvent } from '../domain/types.js';

export interface RealtimeEvent extends DomainEvent {
  streamSequence: number;
}

type Listener = (event: RealtimeEvent) => void;

export class BattleEventBus {
  private readonly history = new Map<string, RealtimeEvent[]>();
  private readonly listeners = new Map<string, Set<Listener>>();

  publish(battleId: string, events: DomainEvent[]): RealtimeEvent[] {
    const existing = this.history.get(battleId) ?? [];
    const published = events.map((event, index) => ({
      ...event,
      streamSequence: existing.length + index + 1,
    }));
    this.history.set(battleId, [...existing, ...published].slice(-500));
    for (const event of published) {
      for (const listener of this.listeners.get(battleId) ?? []) listener(event);
    }
    return published;
  }

  after(battleId: string, streamSequence: number): RealtimeEvent[] {
    return (this.history.get(battleId) ?? []).filter((event) => event.streamSequence > streamSequence);
  }

  subscribe(battleId: string, listener: Listener): () => void {
    const listeners = this.listeners.get(battleId) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(battleId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(battleId);
    };
  }
}

export const battleEventBus = new BattleEventBus();
