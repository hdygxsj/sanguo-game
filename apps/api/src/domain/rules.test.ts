import { describe, expect, it } from 'vitest';
import { generateBattle } from './generate.js';
import { validateAction } from './rules.js';

describe('validateAction', () => {
  it('rejects an action from a city owned by another agent', () => {
    const state = generateBattle('rules-owner', 5, 4, 3);
    const source = state.cities.find((city) => city.owner && city.owner !== state.agents[0]?.id)!;

    const result = validateAction(state, state.agents[0]!.id, {
      type: 'recruit',
      cityId: source.id,
      amount: 5,
    });

    expect(result).toEqual({ ok: false, code: 'NOT_OWNER' });
  });

  it('rejects a friendly-transfer order to a non-friendly destination even with a road route', () => {
    const state = generateBattle('rules-adjacent', 7, 5, 2);
    const source = state.cities.find((city) => city.owner === state.agents[0]?.id)!;
    const target = state.cities.find(
      (city) => city.id !== source.id && !source.adjacent.includes(city.id) && city.terrain !== 'blocked',
    )!;

    expect(
      validateAction(state, state.agents[0]!.id, {
        type: 'move',
        fromCityId: source.id,
        toCityId: target.id,
        troops: 2,
      }),
    ).toEqual({ ok: false, code: 'NOT_FRIENDLY' });
  });

  it('accepts a hold action for an active agent', () => {
    const state = generateBattle('rules-hold', 5, 4, 2);
    expect(validateAction(state, state.agents[0]!.id, { type: 'hold' })).toEqual({ ok: true });
  });
});
