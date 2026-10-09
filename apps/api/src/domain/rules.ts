import type { BattleAction, BattleState, ValidationResult } from './types.js';
import { ECONOMY, developmentCost } from './economy.js';
import { roadRoute } from './marching.js';
import { atWar,validateDiplomacy } from './diplomacy.js';
import {validatePersonnel} from './characters.js';
import {isCourtAction,validateCourt} from './court.js';
import {availableCommanders} from './commanders.js';
import {isEquipmentAction,validateEquipment} from './equipment.js';
import {UNIT_TYPES,UNIT_RULES} from './troops.js';
import {validateFamily} from './family.js';
import {validateConstruction,recruitmentPrice} from './construction.js';
import {isKingdomAction,validateKingdom} from './kingdom.js';
import {isArmyAction,validateArmyAction} from './fieldArmies.js';

export function validateAction(
  state: BattleState,
  agentId: string,
  action: BattleAction,
): ValidationResult {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent?.active || state.status !== 'active') return { ok: false, code: 'AGENT_INACTIVE' };
  if (action.type === 'hold') return { ok: true };
  if(isArmyAction(action))return validateArmyAction(state,agentId,action);
  if(isKingdomAction(action))return validateKingdom(state,agentId,action);
  if(action.type==='recall-army'){
    const army=state.armies?.find(a=>a.id===action.armyId);
    if(!army||army.owner!==agentId)return {ok:false,code:'ARMY_NOT_OWNED'};
    if(!army.halted)return {ok:false,code:'ARMY_NOT_HALTED'};
    const destination=state.cities[army.route[army.leg]!];
    return destination?.owner===agentId?{ok:true}:{ok:false,code:'RETREAT_NOT_FRIENDLY'};
  }
  if(action.type==='form-union')return validateFamily(state,agentId,action);
  if(isEquipmentAction(action))return validateEquipment(state,agentId,action);
  if(isCourtAction(action))return validateCourt(state,agentId,action);
  if('characterId' in action)return validatePersonnel(state,agentId,action);
  if(action.type==='diplomacy'||action.type==='respond-diplomacy')return validateDiplomacy(state,agentId,action);

  if (action.type === 'recruit' || action.type === 'develop') {
    const city = state.cities[action.cityId];
    if (!city) return { ok: false, code: 'CITY_NOT_FOUND' };
    if (city.owner !== agentId) return { ok: false, code: 'NOT_OWNER' };
    if (action.type === 'recruit') {
      if(action.unitType&&!UNIT_TYPES.includes(action.unitType))return {ok:false,code:'INVALID_UNIT_TYPE'};
      if (!Number.isInteger(action.amount) || action.amount < 1) return { ok: false, code: 'INVALID_AMOUNT' };
      if ((state.resources[agentId] ?? 0) < action.amount * recruitmentPrice(city,action.unitType??'spear')) return { ok: false, code: 'INSUFFICIENT_RESOURCES' };
    } else if(action.building!==undefined){
      return validateConstruction(city,action.building,state.resources[agentId]??0);
    } else if(city.construction){
      return {ok:false,code:'CONSTRUCTION_BUSY'};
    } else if ((state.resources[agentId] ?? 0) < developmentCost(city.level) || city.level >= 4) {
      return { ok: false, code: city.level >= 4 ? 'MAX_LEVEL' : 'INSUFFICIENT_RESOURCES' };
    }
    return { ok: true };
  }

  const source = state.cities[action.fromCityId];
  if(action.commanderId&&!availableCommanders(state,agentId).some(c=>c.id===action.commanderId))return {ok:false,code:'COMMANDER_UNAVAILABLE'};
  const target = state.cities[action.toCityId];
  if (!source || !target) return { ok: false, code: 'CITY_NOT_FOUND' };
  if (source.owner !== agentId) return { ok: false, code: 'NOT_OWNER' };
  if(action.type==='attack'&&target.owner&&target.owner!==agentId&&!atWar(state,agentId,target.owner))return {ok:false,code:'NOT_AT_WAR'};
  if (target.terrain === 'blocked') return { ok: false, code: 'BLOCKED_TERRAIN' };
  if (action.type === 'move' && target.owner !== agentId) return { ok: false, code: 'NOT_FRIENDLY' };
  if (action.type === 'attack' && target.owner === agentId) return { ok: false, code: 'TARGET_FRIENDLY' };
  if (!roadRoute(state,source.id,target.id,agentId)) return { ok: false, code: 'NO_ROAD_ROUTE' };
  if (!Number.isInteger(action.troops) || action.troops < 1 || action.troops >= source.troops) {
    return { ok: false, code: 'INVALID_TROOPS' };
  }
  return { ok: true };
}
