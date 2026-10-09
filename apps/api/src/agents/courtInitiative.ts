import type {BattleAction,BattleState,CourtOffice} from '../domain/types.js';
import {COURT_OFFICES,courtBudget,validateCourt} from '../domain/court.js';
import {characterBudget} from '../domain/characters.js';
import {fiscalEstimate} from '../domain/economy.js';
import {factionBonus} from '../domain/factionTraits.js';
import {atWar,tradePartners} from '../domain/diplomacy.js';
import {effectiveAttributes} from '../domain/equipment.js';
import {reservedCommander} from '../domain/commanders.js';

/** Explicit fiscal heuristic shared by both policies; not a learned prediction. */
export function courtInitiative(state:BattleState,owner:string):BattleAction|undefined{
  const seat=state.agents.findIndex(a=>a.id===owner);
  if(seat<0||state.playerAgentId===owner||state.turn===0||state.turn%11!==seat%11)return;
  const fiscal=fiscalEstimate(state.cities.filter(c=>c.owner===owner),0,(state.armies??[]).filter(a=>a.owner===owner));
  const staff=characterBudget(state,owner),current=courtBudget(state,owner);
  const net=fiscal.net+staff.revenue-staff.salary+tradePartners(state,owner).length*3+factionBonus(state,owner).total;
  const war=state.agents.some(a=>a.id!==owner&&atWar(state,owner,a.id));
  const reserved=reservedCommander(state,owner);
  const choices:{action:BattleAction;score:number}[]=[];
  for(const person of state.characters??[])for(const office of Object.keys(COURT_OFFICES) as CourtOffice[]){
    if(person.id===reserved&&office!=='marshal')continue;
    const action={type:'appoint-court' as const,characterId:person.id,office};
    if(!validateCourt(state,owner,action).ok)continue;
    const job=COURT_OFFICES[office];
    const projected=courtBudget({...state,court:{...state.court,[owner]:{...state.court?.[owner],[office]:person.id}}},owner);
    const gain=projected.revenue-projected.salary-current.revenue+current.salary;
    if((state.resources[owner]??0)-job.cost<100+Math.max(0,-net-gain)*20)continue;
    if(office==='marshal'){
      const command=effectiveAttributes(state,person).command;
      if(war&&command>=70&&net+gain>=0)choices.push({action,score:command*person.loyalty/10000});
    }else if(gain>0&&job.cost/gain<=45)choices.push({action,score:gain/job.cost*45});
  }
  return choices.sort((a,b)=>b.score-a.score)[0]?.action;
}
