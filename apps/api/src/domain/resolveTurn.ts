import { validateAction } from './rules.js';
import type { AgentAction, BattleState, DomainEvent, TurnResult } from './types.js';

function weatherAttackModifier(weather: string): number {
  if (weather === 'blizzard') return 0.72;
  if (weather === 'snow' || weather === 'rain') return 0.86;
  if (weather === 'fog') return 0.92;
  return 1;
}

export function resolveTurn(
  previous: BattleState,
  submittedActions: AgentAction[],
  expectedVersion: number,
): TurnResult {
  if (previous.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
  if (previous.status !== 'active') throw new Error('BATTLE_COMPLETED');

  const state: BattleState = structuredClone(previous);
  state.version += 1;
  state.turn += 1;
  const events: DomainEvent[] = [];
  const emit = (event: Omit<DomainEvent, 'sequence' | 'turn'>) => {
    events.push({ ...event, sequence: events.length + 1, turn: state.turn });
  };

  emit({ type: 'turn-start', message: `第 ${state.turn} 回合开始` });
  const actionByAgent = new Map(submittedActions.map((entry) => [entry.agentId, entry.action]));

  for (const agent of state.agents.filter((candidate) => candidate.active)) {
    const action = actionByAgent.get(agent.id) ?? { type: 'hold' as const };
    const validation = validateAction(previous, agent.id, action);
    if (!validation.ok) {
      emit({ type: 'invalid-action', agentId: agent.id, message: `${agent.name} 的行动无效：${validation.code}` });
      continue;
    }

    if (action.type === 'hold') {
      emit({ type: 'hold', agentId: agent.id, message: `${agent.name} 按兵不动` });
    } else if (action.type === 'recruit') {
      state.cities[action.cityId]!.troops += action.amount;
      state.resources[agent.id]! -= action.amount * 2;
      emit({ type: 'recruit', agentId: agent.id, cityId: action.cityId, amount: action.amount, message: `${agent.name} 征募 ${action.amount} 兵力` });
    } else if (action.type === 'develop') {
      const city = state.cities[action.cityId]!;
      state.resources[agent.id]! -= city.level * 12;
      city.level += 1;
      city.defenseMultiplier = 1 + city.level * 0.12;
      emit({ type: 'develop', agentId: agent.id, cityId: city.id, message: `${agent.name} 将 ${city.name} 升至 ${city.level} 级` });
    } else if (action.type === 'move') {
      const source = state.cities[action.fromCityId]!;
      const target = state.cities[action.toCityId]!;
      source.troops -= action.troops;
      target.troops += action.troops;
      emit({ type: 'move', agentId: agent.id, fromCityId: source.id, toCityId: target.id, amount: action.troops, message: `${agent.name} 调动 ${action.troops} 兵力` });
    } else {
      const source = state.cities[action.fromCityId]!;
      const target = state.cities[action.toCityId]!;
      source.troops -= action.troops;
      const attackPower = action.troops * weatherAttackModifier(target.weather);
      const defensePower = target.troops * target.defenseMultiplier;
      emit({ type: 'attack', agentId: agent.id, fromCityId: source.id, toCityId: target.id, amount: action.troops, message: `${agent.name} 进攻 ${target.name}` });
      if (attackPower > defensePower) {
        const previousOwner = target.owner;
        target.owner = agent.id;
        target.troops = Math.max(1, Math.round(attackPower - defensePower));
        emit({ type: 'capture', agentId: agent.id, cityId: target.id, fromCityId: source.id, toCityId: target.id, message: `${agent.name} 占领 ${target.name}${previousOwner ? '' : '（中立）'}` });
      } else {
        target.troops = Math.max(1, Math.round(target.troops - attackPower / target.defenseMultiplier));
      }
    }
  }

  for (const agent of state.agents) {
    const cities = state.cities.filter((city) => city.owner === agent.id);
    if (cities.length === 0) {
      agent.active = false;
      continue;
    }
    const income = cities.reduce((total, city) => total + city.level + (city.resourceTrait ? 2 : 0), 3);
    state.resources[agent.id] = (state.resources[agent.id] ?? 0) + income;
    emit({ type: 'income', agentId: agent.id, amount: income, message: `${agent.name} 获得 ${income} 资源` });
  }

  const active = state.agents.filter((agent) => agent.active);
  if (active.length === 1 || state.turn >= state.maxTurns) {
    const ranked = [...state.agents].sort(
      (left, right) =>
        state.cities.filter((city) => city.owner === right.id).length -
        state.cities.filter((city) => city.owner === left.id).length,
    );
    state.status = 'completed';
    state.winner = active.length === 1 ? active[0]!.id : ranked[0]!.id;
    emit({ type: 'victory', agentId: state.winner, message: `${state.agents.find((agent) => agent.id === state.winner)?.name} 赢得诸城争霸` });
  }

  emit({ type: 'turn-end', message: `第 ${state.turn} 回合结束` });
  return { state, events };
}
