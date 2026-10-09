import {formatTroops} from './troopScale.js';
import {isArmyAction,resolveArmyAction,settleArmyRecruits,type ArmyRecruit} from './fieldArmies.js';
import {isKingdomAction,resolveKingdom,settleKingdoms} from './kingdom.js';
import {factionBonus} from './factionTraits.js';
import { validateAction } from './rules.js';
import { ECONOMY, developmentCost, fiscalEstimate } from './economy.js';
import { advanceArmies, dispatchArmy } from './marching.js';
import {resolveDiplomacy,settleDiplomacy,tradePartners} from './diplomacy.js';
import {characterBudget,reconcileOffices,resolvePersonnel,settleCharacters} from './characters.js';
import {isCourtAction,resolveCourt} from './court.js';
import {freeDefeatedCaptors} from './commanders.js';
import {isEquipmentAction,resolveEquipment,reconcileEquipment} from './equipment.js';
import {mergeTroops,setTroops,troopUpkeep,UNIT_RULES} from './troops.js';
import {resolveFamily} from './family.js';
import {settleFamily} from './lifecycle.js';
import {refreshTalents} from './talentRefresh.js';
import {BUILDINGS,buildingCost,recruitmentPrice,settleConstruction} from './construction.js';
import type { AgentAction, BattleState, DomainEvent, TurnResult, UnitType } from './types.js';

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
  const recruits:{owner:string;cityId:number;unitType:UnitType;amount:number;cost:number}[]=[];
  const armyRecruits:ArmyRecruit[]=[];

  for (const agent of state.agents.filter((candidate) => candidate.active)) {
    const action = actionByAgent.get(agent.id) ?? { type: 'hold' as const };
    const validation = validateAction(state, agent.id, action);
    if (!validation.ok) {
      emit({ type: 'invalid-action', agentId: agent.id, message: `${agent.name} 的行动无效：${validation.code}` });
      continue;
    }

    if(isArmyAction(action)){
      resolveArmyAction(state,agent.id,action,emit,armyRecruits);
    }else if(isKingdomAction(action)){
      resolveKingdom(state,agent.id,action,emit);
    }else if(action.type==='recall-army'){
      const army=state.armies!.find(a=>a.id===action.armyId)!;
      const from=army.route[army.leg+1]!,to=army.route[army.leg]!;
      army.route=[from,to];army.leg=0;army.progress=1-army.progress;army.halted=false;
      delete army.blockedReason;
      emit({type:'march',agentId:agent.id,armyId:army.id,fromCityId:from,toCityId:to,message:`${army.id} 沿原路撤回 ${state.cities[to]!.name}`});
    }else if(action.type==='form-union'){
      resolveFamily(state,agent.id,action,emit);
    }else if(isEquipmentAction(action)){
      resolveEquipment(state,agent.id,action,emit);
    }else if(isCourtAction(action)){
      resolveCourt(state,agent.id,action,emit);
    }else if('characterId' in action){
      resolvePersonnel(state,agent.id,action,emit);
    }else if(action.type==='diplomacy'||action.type==='respond-diplomacy') {
      resolveDiplomacy(state,agent.id,action,emit);
    } else if (action.type === 'hold') {
      emit({ type: 'hold', agentId: agent.id, message: `${agent.name} 按兵不动` });
    } else if (action.type === 'recruit') {
      const unitType=action.unitType??'spear';
      const cost=action.amount * recruitmentPrice(state.cities[action.cityId]!,unitType);
      state.resources[agent.id]! -= cost;
      recruits.push({owner:agent.id,cityId:action.cityId,unitType,amount:action.amount,cost});
    } else if (action.type === 'develop') {
      const city = state.cities[action.cityId]!;
      if(action.building){
        state.resources[agent.id]!-=buildingCost(city,action.building);
        city.construction={building:action.building,level:(city.buildings?.[action.building]??0)+1,completesTurn:state.turn+1};
        emit({type:'develop',agentId:agent.id,cityId:city.id,message:`${city.name} 开建${BUILDINGS[action.building].name}，第 ${city.construction.completesTurn} 回合竣工`});
        continue;
      }
      state.resources[agent.id]! -= developmentCost(city.level);
      city.level += 1;
      city.defenseMultiplier = 1 + city.level * 0.12;
      emit({ type: 'develop', agentId: agent.id, cityId: city.id, message: `${agent.name} 将 ${city.name} 升至 ${city.level} 级` });
    } else {
      dispatchArmy(state,agent.id,action.fromCityId,action.toCityId,action.troops,emit,action.commanderId);
    }
  }

  advanceArmies(state,emit);
  settleArmyRecruits(state,armyRecruits,emit);
  // Simultaneous orders: new recruits cannot reinforce this turn's combat.
  for(const {owner,cityId,unitType,amount,cost} of recruits){
    const city=state.cities[cityId]!;
    if(city.owner!==owner){
      state.resources[owner]!+=cost;
      emit({type:'recruit',agentId:owner,cityId,amount:0,message:`${city.name} 失守，征募取消，退还 ${cost}`});
      continue;
    }
    mergeTroops(city,{troops:amount,units:{[unitType]:amount}});
    emit({type:'recruit',agentId:owner,cityId,amount,message:`${city.name} 战后征募 ${UNIT_RULES[unitType].name} ${formatTroops(amount)} 人，下回合可参战`});
  }
  settleConstruction(state,emit);
  reconcileOffices(state,emit);
  for(const agent of state.agents)agent.active=state.cities.some(c=>c.owner===agent.id)||state.armies!.some(a=>a.owner===agent.id);

  for (const agent of state.agents) {
    const cities = state.cities.filter((city) => city.owner === agent.id);
    const armies = state.armies!.filter(army=>army.owner===agent.id);
    if (cities.length === 0 && armies.length === 0) {
      agent.active = false;
      continue;
    }
    const budget = fiscalEstimate(cities,0,armies);
    const bonus=factionBonus(state,agent.id,cities,armies);
    if(bonus.total)emit({type:'faction-bonus',agentId:agent.id,amount:bonus.total,message:`${agent.name} 势力特性：产业 +${bonus.estates}、商贸 +${bonus.trade}、军饷返还 +${bonus.wages}`});
    const trade=tradePartners(state,agent.id).length*3;
    if(trade)emit({type:'trade-income',agentId:agent.id,amount:trade,message:`${agent.name} 商约收入 ${trade}`});
    const personnel=characterBudget(state,agent.id);
    if(personnel.salary)emit({type:'personnel',agentId:agent.id,message:`${agent.name} 治理增收 ${personnel.revenue}，人物俸禄 ${personnel.salary}`});
    const available = (state.resources[agent.id] ?? 0) + budget.revenue + trade + personnel.revenue + bonus.total;
    const expense = budget.maintenance + budget.wages + personnel.salary;
    settleCharacters(state,agent.id,available>=expense,emit);
    state.resources[agent.id] = Math.max(0, available - expense);
    emit({ type: 'income', agentId: agent.id, amount: budget.revenue, message: `${agent.name} 应征税收 ${budget.grossRevenue}，地方维护后盈余的治理损耗 ${budget.administrationLoss}，实收 ${budget.revenue}` });
    emit({ type: 'upkeep', agentId: agent.id, amount: Math.min(available, expense), message: `${agent.name} 军饷 ${budget.wages}、城池维护 ${budget.maintenance}，实付 ${Math.min(available, expense)}` });
    if (available < expense) {
      let unpaid = expense - available;
      let deserters = 0;
      for (const city of [...cities,...armies].sort((a, b) => b.troops - a.troops)) {
        const before=troopUpkeep(city);
        const loss = Math.min(Math.ceil(unpaid/Math.max(.15,before/Math.max(1,city.troops))), Math.ceil(city.troops * .2));
        setTroops(city,city.troops-loss);unpaid=Math.max(0,unpaid-(before-troopUpkeep(city)));deserters+=loss;
      }
      emit({ type: 'desertion', agentId: agent.id, amount: deserters, message: `${agent.name} 欠饷 ${expense - available}，${formatTroops(deserters)} 人离队` });
    }
  }

  state.armies=state.armies!.filter(a=>a.troops>0);
  for(const agent of state.agents) agent.active=state.cities.some(c=>c.owner===agent.id)||state.armies.some(a=>a.owner===agent.id);
  settleDiplomacy(state,emit);
  freeDefeatedCaptors(state,emit);
  reconcileEquipment(state);
  settleFamily(state,emit);
  settleKingdoms(state,emit);
  refreshTalents(state);

  const active = state.agents.filter((agent) => agent.active);
  if (active.length === 1 && state.status !== 'completed') {
    state.status = 'completed';
    state.winner = active[0]!.id;
    state.victoryReason = 'conquest';
    emit({ type: 'victory', agentId: state.winner, message: `${state.agents.find((agent) => agent.id === state.winner)?.name} 赢得诸城争霸` });
  }

  emit({ type: 'turn-end', message: `第 ${state.turn} 回合结束` });
  return { state, events };
}
