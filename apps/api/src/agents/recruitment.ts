import type {BattleState,BattleAction} from '../domain/types.js';
import {atWar,tradePartners} from '../domain/diplomacy.js';
import {fiscalEstimate} from '../domain/economy.js';
import {factionBonus} from '../domain/factionTraits.js';
import {characterBudget} from '../domain/characters.js';
import {recruitmentPrice} from '../domain/construction.js';
import {UNIT_TYPES,mergeTroops,troopUpkeep} from '../domain/troops.js';
import {validateAction} from '../domain/rules.js';
import {preparationTarget} from './preparation.js';
import {flankGarrison} from './campaign.js';

export function recruitmentActions(state:BattleState,owner:string):BattleAction[]{
  const owned=state.cities.filter(c=>c.owner===owner&&c.terrain!=='blocked');
  const preparation=preparationTarget(state,owner);
  const cashReserve=preparation?40:20;
  const hostile=(id:number)=>{const c=state.cities[id];return c&&c.terrain!=='blocked'&&c.owner!==owner&&(!c.owner||atWar(state,owner,c.owner)||c.owner===preparation);};
  const depth=new Map<number,number>(),queue:number[]=[];
  for(const city of owned)if(city.adjacent.some(hostile)){depth.set(city.id,0);queue.push(city.id);}
  for(let i=0;i<queue.length;i++){
    const id=queue[i]!,d=depth.get(id)!;if(d>=1)continue;
    for(const next of state.cities[id]!.adjacent)if(state.cities[next]?.owner===owner&&state.cities[next]!.terrain!=='blocked'&&!depth.has(next)){depth.set(next,d+1);queue.push(next);}
  }
  const money=state.resources[owner]??0,armies=(state.armies??[]).filter(a=>a.owner===owner);
  const personnel=characterBudget(state,owner),trade=tradePartners(state,owner).length*3;
  const budget=fiscalEstimate(owned,0,armies);
  const existingWages=[...owned,...armies].reduce((sum,body)=>sum+troopUpkeep(body),0);
  const actions:BattleAction[]=[];
  for(const city of owned.filter(c=>depth.has(c.id)).sort((a,b)=>depth.get(a.id)!-depth.get(b.id)!||a.troops-b.troops||a.id-b.id)){
    const hostilePower=Math.max(0,...city.adjacent.filter(hostile).map(id=>state.cities[id]!.troops*state.cities[id]!.defenseMultiplier));
    const assaultWithGuard=Math.min(...city.adjacent.filter(hostile).map(id=>{
      const target=state.cities[id]!,assault=Math.ceil(target.troops*target.defenseMultiplier*1.6);
      const occupation=flankGarrison(state,{...target,owner,troops:city.troops,units:city.units},city.id,owner);
      const guard=flankGarrison(state,city,id,owner);
      return occupation?Math.max(assault+occupation+guard,Math.ceil((assault+occupation)/.85)):assault+guard;
    }));
    const desired=depth.get(city.id)===0?Math.max(24,Math.ceil(hostilePower*1.6),assaultWithGuard):40;
    const inbound=armies.filter(a=>!a.halted&&a.route.at(-1)===city.id).reduce((sum,a)=>sum+a.troops,0);
    for(const unitType of UNIT_TYPES){
      const price=recruitmentPrice(city,unitType);
      let low=0,high=Math.max(0,Math.min(desired-city.troops-inbound,Math.floor((money-cashReserve)/price)));
      // Count actual rounded upkeep and all existing armies, not just this garrison.
      // Affordability is monotone. Search the real deficit rather than impose an
      // AI-only batch cap or scan a potentially enormous treasury one unit at a time.
      while(low<high){
        const amount=Math.ceil((low+high)/2);
        const copy={...city,units:city.units?{...city.units}:undefined};
        mergeTroops(copy,{troops:amount,units:{[unitType]:amount}});
        const wages=Math.ceil(existingWages+troopUpkeep(copy)-troopUpkeep(city)-1e-9);
        const bonus=factionBonus(state,owner,owned.map(c=>c.id===city.id?copy:c),armies);
        const projectedNet=budget.revenue-budget.maintenance-wages+personnel.revenue-personnel.salary+trade+bonus.total;
        if(money-amount*price>=cashReserve+Math.max(0,-projectedNet)*20)low=amount;
        else high=amount-1;
      }
      const amount=low;
      const action:BattleAction={type:'recruit',cityId:city.id,unitType,amount};
      if(amount>0&&validateAction(state,owner,action).ok)actions.push(action);
    }
  }
  return actions;
}
