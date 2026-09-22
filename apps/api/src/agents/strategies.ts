import { validateAction } from '../domain/rules.js';
import type { AgentState, BattleAction, BattleState, CityState } from '../domain/types.js';

function ownedCities(state: BattleState, agentId: string): CityState[] {
  return state.cities.filter((city) => city.owner === agentId);
}

function firstLegal(state: BattleState, agentId: string, actions: BattleAction[]): BattleAction {
  return actions.find((action) => validateAction(state, agentId, action).ok) ?? { type: 'hold' };
}

function expansionActions(state: BattleState, agent: AgentState): BattleAction[] {
  return ownedCities(state, agent.id)
    .flatMap((source) =>
      source.adjacent.map((targetId) => ({ source, target: state.cities[targetId]! })),
    )
    .filter(({ target }) => target.terrain !== 'blocked' && target.owner !== agent.id)
    .sort((left, right) => left.target.troops - right.target.troops)
    .map(({ source, target }) => ({
      type: 'attack' as const,
      fromCityId: source.id,
      toCityId: target.id,
      troops: Math.max(1, Math.floor(source.troops * 0.6)),
    }));
}

function recruitActions(state: BattleState, agent: AgentState): BattleAction[] {
  return ownedCities(state, agent.id)
    .sort((left, right) => left.troops - right.troops)
    .map((city) => ({
      type: 'recruit' as const,
      cityId: city.id,
      amount: Math.max(1, Math.min(6, Math.floor((state.resources[agent.id] ?? 0) / 2))),
    }));
}

function developActions(state: BattleState, agent: AgentState): BattleAction[] {
  return ownedCities(state, agent.id)
    .sort((left, right) => left.level - right.level)
    .map((city) => ({ type: 'develop' as const, cityId: city.id }));
}

export function chooseAction(state: BattleState, agent: AgentState, randomValue = 0.5): BattleAction {
  if (agent.strategy === 'economic') {
    return firstLegal(state, agent.id, [...developActions(state, agent), ...recruitActions(state, agent)]);
  }
  if (agent.strategy === 'defensive') {
    return firstLegal(state, agent.id, [...recruitActions(state, agent), ...developActions(state, agent)]);
  }
  if (agent.strategy === 'expansion') {
    return firstLegal(state, agent.id, [...expansionActions(state, agent), ...recruitActions(state, agent)]);
  }

  const groups = randomValue < 0.45
    ? [expansionActions(state, agent), recruitActions(state, agent), developActions(state, agent)]
    : [recruitActions(state, agent), developActions(state, agent), expansionActions(state, agent)];
  return firstLegal(state, agent.id, groups.flat());
}
