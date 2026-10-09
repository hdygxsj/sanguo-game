import type {BattleState,BattleAction,CityState} from '../domain/types.js';
import {initialCapital,kingdomOf,migrationCost,KINGDOM_RULES} from '../domain/kingdom.js';
import {factionTrait} from '../domain/factionTraits.js';
import {validateAction} from '../domain/rules.js';
import {atWar} from '../domain/diplomacy.js';

/** Transparent strategic rule alongside RL, shared by baseline and learned agents. */
export function kingdomInitiative(state:BattleState,id:string):BattleAction|undefined{
  if(state.playerAgentId===id)return;
  const country=kingdomOf(state,id),money=state.resources[id]??0;
  const threatened=(city:CityState)=>Math.max(0,...city.adjacent.map(n=>{
    const c=state.cities[n];return c?.owner&&c.owner!==id&&atWar(state,id,c.owner)?c.troops:0;
  }))+(state.armies??[]).filter(a=>a.owner!==id&&!a.halted&&a.route.slice(a.leg+1).includes(city.id)&&atWar(state,id,a.owner)).reduce((s,a)=>s+a.troops,0)>city.troops*city.defenseMultiplier;
  if(country){
    const capital=state.cities[country.capitalId];if(!capital||capital.owner!==id||!threatened(capital))return;
    for(const city of state.cities.filter(c=>c.owner===id&&c.troops>=15&&!threatened(c)).sort((a,b)=>b.troops-a.troops)){
      const action:BattleAction={type:'move-capital',cityId:city.id};
      if(money>=migrationCost(state,city.id)+50&&validateAction(state,id,action).ok)return action;
    }
    return;
  }
  const home=initialCapital(state,id);if(!home||home.troops<15||threatened(home)||money<KINGDOM_RULES.cost+100)return;
  const name=factionTrait(state.agents.find(a=>a.id===id)?.name??'').kingdom;
  for(const candidate of [name,`大${name}`,`新${name}`]){
    const action:BattleAction={type:'found-kingdom',name:candidate};
    if(validateAction(state,id,action).ok)return action;
  }
}
