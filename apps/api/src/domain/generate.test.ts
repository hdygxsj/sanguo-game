import { describe, expect, it } from 'vitest';
import { generateBattle } from './generate.js';

describe('generateBattle', () => {
  it('produces the same map for the same seed', () => {
    expect(generateBattle('three-kingdoms', 7, 5, 4)).toEqual(
      generateBattle('three-kingdoms', 7, 5, 4),
    );
  });

  it('assigns one starting city to each agent and never owns blocked terrain', () => {
    const state = generateBattle('owners', 7, 5, 4);
    const ownedCities = state.cities.filter((city) => city.owner !== null);

    expect(new Set(ownedCities.map((city) => city.owner)).size).toBe(4);
    expect(
      state.cities.filter((city) => city.terrain === 'blocked').every((city) => city.owner === null),
    ).toBe(true);
  });

  it('creates symmetric orthogonal adjacency inside the map', () => {
    const state = generateBattle('adjacency', 5, 4, 3);

    for (const city of state.cities) {
      for (const neighborId of city.adjacent) {
        expect(state.cities[neighborId]?.adjacent).toContain(city.id);
      }
    }
  });
});
