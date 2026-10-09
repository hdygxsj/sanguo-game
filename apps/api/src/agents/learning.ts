import { validateAction } from '../domain/rules.js';
import {kingdomInitiative} from './kingdomInitiative.js';
import {isKingdomAction} from '../domain/kingdom.js';
import { diplomaticInitiative } from '../domain/diplomacy.js';
import {personnelInitiative} from '../domain/characters.js';
import {withCommander,commandMultiplier} from '../domain/commanders.js';
import {equipmentInitiative,isEquipmentAction} from '../domain/equipment.js';
import {UNIT_TYPES,UNIT_RULES,detachTroops,troopMultiplier} from '../domain/troops.js';
import {MARCH_SPEED,remainingMarchTurns,roadRoute,weatherModifier} from '../domain/marching.js';
import {updateReturn,RETURN_STEPS,type Transition} from './returns.js';
import {campaignActions} from './campaign.js';
import {familyInitiative} from './familyInitiative.js';
import {BUILDING_TYPES,buildingCost,recruitmentPrice} from '../domain/construction.js';
import {recruitmentActions} from './recruitment.js';
import {investmentContext,investmentReturn,completedInvestmentValue} from './investment.js';
import {economicInitiative} from './economicPlanning.js';
import {courtInitiative} from './courtInitiative.js';
import type { AgentState, BattleAction, BattleState, LearnedPolicy } from '../domain/types.js';

export const FEATURE_COUNT = 23;
export const newPolicy = (): LearnedPolicy => ({ version: 4, algorithm: 'Linear Q-learning / self-play',
  weights: Array(FEATURE_COUNT).fill(0), episodes: 0, trainedAt: '',
  evaluation: { games: 0, winRate: 0, baselineWinRate: 0, meanCounties: 0 } });

export function upgradePolicy(policy: LearnedPolicy): LearnedPolicy {
  const copy=structuredClone(policy);
  copy.version=4;
  copy.weights=Array.from({length:FEATURE_COUNT},(_,i)=>policy.weights[i]??0);
  return copy;
}

export function candidates(state: BattleState, agent: AgentState): BattleAction[] {
  // Keep the learner's military choices consistent with the shared logistics
  // planner: arbitrary neighbouring moves can dismantle an ongoing rally.
  const actions: BattleAction[] = [{ type: 'hold' },...recruitmentActions(state,agent.id),...campaignActions(state,agent.id)];
  for (const source of state.cities) {
    if (source.owner !== agent.id) continue;
    actions.push({ type: 'develop', cityId: source.id });
    for(const building of BUILDING_TYPES)actions.push({type:'develop',cityId:source.id,building});
  }
  return actions.map(action=>withCommander(state,agent.id,action)).filter(action => validateAction(state, agent.id, action).ok);
}

export function features(state: BattleState, agent: AgentState, action: BattleAction, economy?:ReturnType<typeof investmentContext>): number[] {
  const f = Array<number>(FEATURE_COUNT).fill(0);
  f[0] = 1;
  if(isKingdomAction(action)){f[1]=.3;return f;}
  if (action.type === 'hold') { f[1] = 1; return f; }
  if(action.type==='recall-army'){f[1]=.3;return f;}
  if(action.type==='form-union'){f[1]=.3;return f;}
  if(isEquipmentAction(action)){f[1]=.3;return f;}
  if('characterId' in action){f[1]=.3;return f;}
  if(action.type==='diplomacy'||action.type==='respond-diplomacy'){f[1]=.3;return f;}
  // Independent player-army orders are not candidates in the legacy learned policy.
  if('armyId' in action||action.type==='raise-army'){f[1]=.3;return f;}
  const source = state.cities['cityId' in action ? action.cityId : action.fromCityId]!;
  const frontier = source.adjacent.filter(id => state.cities[id]!.owner !== agent.id).length / Math.max(1,source.adjacent.length);
  if (action.type === 'recruit') {
    f[2] = Math.min(1,action.amount / 12); f[3] = frontier; f[4] = Math.min(1,source.troops/40);
    const type=action.unitType??'spear',rule=UNIT_RULES[type];
    f[12+UNIT_TYPES.indexOf(type)]=Math.min(1,action.amount/12);
    f[16]=Math.min(1,action.amount*recruitmentPrice(source,type)/Math.max(1,state.resources[agent.id]??0));
    // Ten-turn maintenance relative to current treasury: exposes costly expansion.
    f[17]=Math.min(1,action.amount*rule.upkeep*10/Math.max(1,state.resources[agent.id]??0));
    f[18]=type==='cavalry'?Math.min(1,action.amount/12)*.35:0;
  }
  if (action.type === 'develop') { f[5] = (4-source.level)/3; f[6] = 1 / (1 + state.turn / 60); }
  if(action.type==='develop'&&action.building){
    f[5]=(3-(source.buildings?.[action.building]??0))/3;
    f[16]=Math.min(1,buildingCost(source,action.building)/Math.max(1,state.resources[agent.id]??0));
  }
  if(action.type==='develop'){
    const investment=investmentReturn(source,action.building,economy??investmentContext(state,agent.id));
    f[16]=Math.min(1,investment.cost/Math.max(1,state.resources[agent.id]??0));
    f[19]=Math.max(-1,Math.min(1,investment.income/4));
    f[20]=Math.max(-1,Math.min(1,investment.income*10/Math.max(1,investment.cost)));
  }
  if (action.type === 'attack' || action.type === 'move') {
    const target = state.cities[action.toCityId]!;
    if (action.type === 'attack') {
      // Match automatic siege resolution: detach the actual mixed formation
      // from a copy, including counters, cavalry siege penalty and commander.
      const copy={troops:source.troops,units:source.units};
      const army={id:'siege-feature',owner:agent.id,troops:action.troops,units:detachTroops(copy,action.troops),
        route:[source.id,target.id],leg:0,progress:0,speed:MARCH_SPEED,commanderId:action.commanderId};
      const attack=action.troops*weatherModifier(target.weather)*commandMultiplier(state,army)*troopMultiplier(army,target,true);
      const defense=target.troops*target.defenseMultiplier*troopMultiplier(target,army);
      f[7] = Math.max(-1, Math.min(1, (attack-defense)/20));
      f[8] = Number(attack>defense);
      f[9] = Number(target.owner !== null);
    } else {
      f[10] = target.adjacent.filter(id => state.cities[id]!.owner !== agent.id).length / Math.max(1,target.adjacent.length) - frontier;
      // Rear-to-rear logistics had no signal when both frontier ratios were zero.
      // Preserve legacy dimensions and learn strength/arrival value separately.
      f[21]=Math.min(1,action.troops/40);
      const route=roadRoute(state,source.id,target.id,agent.id);
      if(route){
        const copy={troops:source.troops,units:source.units};
        const turns=remainingMarchTurns(state,{id:'feature-estimate',owner:agent.id,troops:action.troops,
          units:detachTroops(copy,action.troops),route,leg:0,progress:0,speed:MARCH_SPEED,commanderId:action.commanderId});
        f[22]=f[21]!/Math.max(1,turns);
      }
    }
    f[11] = Math.min(1,(source.troops-action.troops)/20) * frontier;
  }
  return f;
}

export const value = (policy: LearnedPolicy, f: number[]) => f.reduce((sum,v,i) => sum+v*(policy.weights[i]??0),0);
export function chooseLearned(state: BattleState, agent: AgentState, policy: LearnedPolicy, epsilon = 0, random = Math.random) {
  const kingdom=kingdomInitiative(state,agent.id);if(kingdom)return kingdom;
  const diplomatic=diplomaticInitiative(state,agent.id);
  if(diplomatic)return diplomatic;
  const family=familyInitiative(state,agent.id);if(family)return family;
  const personnel=personnelInitiative(state,agent.id);if(personnel)return personnel;
  const court=courtInitiative(state,agent.id);if(court)return court;
  const equipment=equipmentInitiative(state,agent.id);if(equipment)return equipment;
  const investment=economicInitiative(state,agent.id);if(investment)return investment;
  if(state.turn>0&&state.turn%3===0){const campaign=campaignActions(state,agent.id)[0];if(campaign)return campaign;}
  const options = candidates(state, agent);
  if (random() < epsilon) return options[Math.floor(random()*options.length)] ?? { type: 'hold' as const };
  let best = options[0] ?? { type: 'hold' as const }, score = -Infinity;
  const economy=investmentContext(state,agent.id);
  for (const action of options) {
    const q = value(policy,features(state,agent,action,economy));
    if (q > score) { score = q; best = action; }
  }
  return best;
}

export function utility(state: BattleState, id: string) {
  let total = 0;
  // Force value must be conserved by dispatch/arrival. Per-body caps rewarded
  // splitting and penalized concentrating an identical surviving army.
  for (const city of state.cities) if (city.owner === id) total += 2 + city.level * .08 + city.troops*.008;
  for (const army of state.armies ?? []) if (army.owner === id) total += army.troops*.008;
  return total + Math.min(state.resources[id] ?? 0,200)*.001+completedInvestmentValue(state,id);
}

export function learn(policy: LearnedPolicy, before: BattleState, after: BattleState, agent: AgentState, action: BattleAction, pending?:Transition[], flush=false) {
  const f = features(before, agent, action);
  const targetValue=value(policy,features(before,agent,chooseLearned(before,agent,policy)));
  const bootstrapBefore=value(policy,f)<targetValue-1e-9?targetValue:undefined;
  const reward = utility(after,agent.id)-utility(before,agent.id) +
    (after.status === 'completed' ? (after.winner === agent.id ? 3 : -1) : 0);
  const nextAgent = after.agents.find(a => a.id === agent.id)!;
  const next = after.status === 'completed' || !nextAgent.active ? 0 :
    value(policy,features(after,nextAgent,chooseLearned(after,nextAgent,policy)));
  const steps=pending??[];
  steps.push({features:f,reward,...(bootstrapBefore===undefined?{}:{bootstrapBefore})});
  if(flush||after.status==='completed'||!nextAgent.active){
    while(steps.length){updateReturn(policy,steps,next);steps.shift();}
  }else if(!pending||steps.length>=RETURN_STEPS){updateReturn(policy,steps,next);steps.shift();}
}
