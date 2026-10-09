import { validateAction } from '../domain/rules.js';
import {kingdomInitiative} from './kingdomInitiative.js';
import { ECONOMY } from '../domain/economy.js';
import {diplomaticInitiative} from '../domain/diplomacy.js';
import {personnelInitiative} from '../domain/characters.js';
import {withCommander} from '../domain/commanders.js';
import {equipmentInitiative} from '../domain/equipment.js';
import {UNIT_RULES,UNIT_TYPES} from '../domain/troops.js';
import {campaignActions} from './campaign.js';
import {familyInitiative} from './familyInitiative.js';
import {recruitmentPrice} from '../domain/construction.js';
import {recruitmentActions} from './recruitment.js';
import {economicInitiative} from './economicPlanning.js';
import {courtInitiative} from './courtInitiative.js';
import type { AgentState, BattleAction, BattleState, CityState } from '../domain/types.js';

function ownedCities(state: BattleState, agentId: string): CityState[] {
  return state.cities.filter((city) => city.owner === agentId);
}

function firstLegal(state: BattleState, agentId: string, actions: BattleAction[]): BattleAction {
  return withCommander(state,agentId,actions.find((action) => validateAction(state, agentId, action).ok) ?? { type: 'hold' });
}

function expansionActions(state: BattleState, agent: AgentState): BattleAction[] {
  return campaignActions(state,agent.id);
}

function recruitActions(state: BattleState, agent: AgentState): BattleAction[] {
  return recruitmentActions(state,agent.id);
}

function developActions(state: BattleState, agent: AgentState): BattleAction[] {
  return ownedCities(state, agent.id)
    .sort((left, right) => left.level - right.level)
    .flatMap((city):BattleAction[] => [
      {type:'develop',cityId:city.id,building:city.terrain==='farmland'||city.resourceTrait==='granary'?'farm':'market'},
      {type:'develop',cityId:city.id,building:'barracks'},
      {type:'develop',cityId:city.id},
    ]);
}

export function chooseAction(state: BattleState, agent: AgentState, randomValue = 0.5): BattleAction {
  const kingdom=kingdomInitiative(state,agent.id);if(kingdom)return kingdom;
  const diplomatic=diplomaticInitiative(state,agent.id);
  if(diplomatic)return diplomatic;
  const family=familyInitiative(state,agent.id);if(family)return family;
  const personnel=personnelInitiative(state,agent.id);if(personnel)return personnel;
  const court=courtInitiative(state,agent.id);if(court)return court;
  const equipment=equipmentInitiative(state,agent.id);if(equipment)return equipment;
  const investment=economicInitiative(state,agent.id);if(investment)return investment;
  if(state.turn>0&&state.turn%3===0){const campaign=campaignActions(state,agent.id)[0];if(campaign)return campaign;}
  if (agent.strategy === 'economic') {
    return firstLegal(state, agent.id, [...developActions(state, agent), ...recruitActions(state, agent)]);
  }
  if (agent.strategy === 'defensive') {
    // Budgeted investment already ran above. Do not exhaust a war chest on
    // unrelated upgrades while a prepared frontier awaits its diplomatic turn.
    return firstLegal(state, agent.id, [...recruitActions(state, agent), ...expansionActions(state, agent)]);
  }
  if (agent.strategy === 'expansion') {
    return firstLegal(state, agent.id, [...expansionActions(state, agent), ...recruitActions(state, agent)]);
  }

  const groups = randomValue < 0.45
    ? [expansionActions(state, agent), recruitActions(state, agent), developActions(state, agent)]
    : [recruitActions(state, agent), developActions(state, agent), expansionActions(state, agent)];
  return firstLegal(state, agent.id, groups.flat());
}
