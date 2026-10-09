import { describe, expect, it } from 'vitest';
import { generateBattle } from './generate.js';
import { resolveTurn } from './resolveTurn.js';

describe('resolveTurn', () => {
  it('never declares a winner just because the legacy turn limit was reached', () => {
    const state = generateBattle('unlimited', 5, 4, 2, 5);
    state.turn = 500;
    const result = resolveTurn(state, [], state.version);
    expect(result.state.status).toBe('active');
    expect(result.state.winner).toBeNull();
    expect(result.events.some(e => e.type === 'victory')).toBe(false);
  });

  it('still awards victory when only one faction survives', () => {
    const state = generateBattle('victory', 5, 4, 2, 0);
    state.cities.forEach(c => { if (c.owner) c.owner = state.agents[0]!.id; });
    const result = resolveTurn(state, [], 0);
    expect(result.state.winner).toBe(state.agents[0]!.id);
    expect(result.state.status).toBe('completed');
  });

  it('charges maintenance and unpaid soldiers desert without negative treasury', () => {
    const state = generateBattle('upkeep', 5, 4, 2, 0);
    const id = state.agents[0]!.id;
    const city = state.cities.find(c => c.owner === id)!;
    city.troops = 200;
    state.resources[id] = 0;
    const result = resolveTurn(state, [], 0);
    expect(result.state.resources[id]).toBe(0);
    expect(result.state.cities[city.id]!.troops).toBeLessThan(200);
    expect(result.events.some(e => e.type === 'upkeep' && e.agentId === id)).toBe(true);
    expect(result.events.some(e => e.type === 'desertion' && e.agentId === id)).toBe(true);
    expect(state.cities[city.id]!.troops).toBe(200);
  });
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
