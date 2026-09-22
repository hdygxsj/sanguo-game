import type { BattleAction, BattleState, ValidationResult } from './types.js';

export function validateAction(
  state: BattleState,
  agentId: string,
  action: BattleAction,
): ValidationResult {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent?.active || state.status !== 'active') return { ok: false, code: 'AGENT_INACTIVE' };
  if (action.type === 'hold') return { ok: true };

  if (action.type === 'recruit' || action.type === 'develop') {
    const city = state.cities[action.cityId];
    if (!city) return { ok: false, code: 'CITY_NOT_FOUND' };
    if (city.owner !== agentId) return { ok: false, code: 'NOT_OWNER' };
    if (action.type === 'recruit') {
      if (!Number.isInteger(action.amount) || action.amount < 1) return { ok: false, code: 'INVALID_AMOUNT' };
      if ((state.resources[agentId] ?? 0) < action.amount * 2) return { ok: false, code: 'INSUFFICIENT_RESOURCES' };
    } else if ((state.resources[agentId] ?? 0) < city.level * 12 || city.level >= 4) {
      return { ok: false, code: city.level >= 4 ? 'MAX_LEVEL' : 'INSUFFICIENT_RESOURCES' };
    }
    return { ok: true };
  }

  const source = state.cities[action.fromCityId];
  const target = state.cities[action.toCityId];
  if (!source || !target) return { ok: false, code: 'CITY_NOT_FOUND' };
  if (source.owner !== agentId) return { ok: false, code: 'NOT_OWNER' };
  if (!source.adjacent.includes(target.id)) return { ok: false, code: 'NOT_ADJACENT' };
  if (target.terrain === 'blocked') return { ok: false, code: 'BLOCKED_TERRAIN' };
  if (!Number.isInteger(action.troops) || action.troops < 1 || action.troops >= source.troops) {
    return { ok: false, code: 'INVALID_TROOPS' };
  }
  if (action.type === 'move' && target.owner !== agentId) return { ok: false, code: 'NOT_FRIENDLY' };
  if (action.type === 'attack' && target.owner === agentId) return { ok: false, code: 'TARGET_FRIENDLY' };
  return { ok: true };
}
