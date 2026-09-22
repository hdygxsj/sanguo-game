import { describe, expect, it, vi } from 'vitest';
import { BattleEventBus } from './eventBus.js';

describe('BattleEventBus', () => {
  it('publishes events in order and replays events after the requested sequence', () => {
    const bus = new BattleEventBus();
    const listener = vi.fn();
    bus.publish('battle-1', [
      { sequence: 1, turn: 1, type: 'turn-start', message: 'start' },
      { sequence: 2, turn: 1, type: 'hold', message: 'hold' },
    ]);
    const unsubscribe = bus.subscribe('battle-1', listener);
    bus.publish('battle-1', [{ sequence: 3, turn: 1, type: 'turn-end', message: 'end' }]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(bus.after('battle-1', 1).map((event) => event.sequence)).toEqual([2, 3]);
    unsubscribe();
  });
});
