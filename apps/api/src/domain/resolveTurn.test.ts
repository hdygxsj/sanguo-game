import { describe, expect, it } from 'vitest';
import { generateBattle } from './generate.js';
import { resolveTurn } from './resolveTurn.js';

describe('resolveTurn', () => {
  it('advances the version and emits ordered turn events', () => {
    const state = generateBattle('resolve-hold', 5, 4, 2);
    const result = resolveTurn(
      state,
      state.agents.map((agent) => ({ agentId: agent.id, action: { type: 'hold' as const } })),
      state.version,
    );

    expect(result.state.version).toBe(state.version + 1);
    expect(result.state.turn).toBe(state.turn + 1);
    expect(result.events.map((event) => event.sequence)).toEqual(
      [...result.events].map((_, index) => index + 1),
    );
  });

  it('rejects stale version execution', () => {
    const state = generateBattle('resolve-stale', 5, 4, 2);
    expect(() => resolveTurn(state, [], state.version - 1)).toThrowError('VERSION_CONFLICT');
  });

  it('recruits troops and spends resources', () => {
    const state = generateBattle('resolve-recruit', 5, 4, 2);
    const agent = state.agents[0]!;
    const city = state.cities.find((candidate) => candidate.owner === agent.id)!;

    const result = resolveTurn(
      state,
      [{ agentId: agent.id, action: { type: 'recruit', cityId: city.id, amount: 5 } }],
      state.version,
    );

    expect(result.state.cities[city.id]?.troops).toBe(city.troops + 5);
    expect(result.state.resources[agent.id]).toBeLessThan(state.resources[agent.id]! + 8);
    expect(result.events.some((event) => event.type === 'recruit')).toBe(true);
  });
});
