import type {BattleAction,BattleState,BuildingType} from '../domain/types.js';
import {atWar,tradePartners} from '../domain/diplomacy.js';
import {fiscalEstimate} from '../domain/economy.js';
import {factionBonus} from '../domain/factionTraits.js';
import {characterBudget} from '../domain/characters.js';
import {validateAction} from '../domain/rules.js';
import {investmentContext,investmentReturn} from './investment.js';

/** Explicit fiscal planner alongside the learned tactical policy, not a trained
 * prediction. Build only when the after-tax payback and cash runway justify it. */
export function economicInitiative(state:BattleState,owner:string):BattleAction|undefined {
  const seat=state.agents.findIndex(a=>a.id===owner);
  if(seat<0||state.playerAgentId===owner||state.turn===0||state.turn%5!==seat%5)return;
  const cities=state.cities.filter(c=>c.owner===owner);
  if(cities.filter(c=>c.construction).length>=2)return;
  const armies=(state.armies??[]).filter(a=>a.owner===owner);
  const fiscal=fiscalEstimate(cities,0,armies),personnel=characterBudget(state,owner);
  const net=fiscal.net+personnel.revenue-personnel.salary+tradePartners(state,owner).length*3+factionBonus(state,owner).total;
  // Two construction settlements plus one contingency turn; no free capital.
  const reserve=30+Math.max(0,-net)*3,money=state.resources[owner]??0;
  const context=investmentContext(state,owner);
  const choices:{action:BattleAction;returnRate:number;income:number}[]=[];
  for(const city of cities){
    if(city.terrain==='blocked'||city.construction)continue;
    const threatened=city.adjacent.some(id=>{
      const target=state.cities[id];
      return target?.owner&&atWar(state,owner,target.owner)&&target.troops>city.troops*city.defenseMultiplier;
    })||(state.armies??[]).some(a=>a.owner!==owner&&atWar(state,owner,a.owner)&&!a.halted&&a.route.slice(a.leg+1).includes(city.id));
    if(threatened)continue;
    for(const building of ['farm','market'] as BuildingType[]){
      const action:BattleAction={type:'develop',cityId:city.id,building};
      if(!validateAction(state,owner,action).ok)continue;
      const investment=investmentReturn(city,building,context);
      if(investment.income<=0||investment.cost/investment.income>30||money-investment.cost<reserve)continue;
      choices.push({action,returnRate:investment.income/investment.cost,income:investment.income});
    }
  }
  return choices.sort((a,b)=>b.returnRate-a.returnRate||b.income-a.income)[0]?.action;
}
