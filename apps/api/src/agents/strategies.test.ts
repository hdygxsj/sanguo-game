import { describe, expect, it } from 'vitest';
import { generateBattle } from '../domain/generate.js';
import { chooseAction } from './strategies.js';

describe('chooseAction', () => {
  it('returns a deterministic legal action for every built-in strategy', () => {
    const state = generateBattle('agent-actions', 7, 5, 4);

    for (const agent of state.agents) {
      expect(chooseAction(state, agent, 0.25)).toEqual(chooseAction(state, agent, 0.25));
    }
  });

  it('economic agents develop when they can afford it', () => {
    const state = generateBattle('economic-agent', 5, 4, 2);
    const agent = state.agents[0]!;
    agent.strategy = 'economic';
    state.resources[agent.id] = 100;

    expect(chooseAction(state, agent, 0.5).type).toBe('develop');
  });
});
