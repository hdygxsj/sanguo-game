import { describe, expect, it } from 'vitest';
import { generateBattle } from '../domain/generate.js';
import { runAgent } from './runner.js';

describe('runAgent', () => {
  it('falls back to hold when a strategy exceeds the timeout', async () => {
    const state = generateBattle('timeout', 5, 4, 2);
    const result = await runAgent(
      state,
      state.agents[0]!,
      async () => new Promise(() => undefined),
      5,
    );

    expect(result).toEqual({ action: { type: 'hold' }, timedOut: true });
  });
});
