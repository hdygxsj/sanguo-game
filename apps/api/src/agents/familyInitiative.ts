import type {BattleState,BattleAction} from '../domain/types.js';
import {validateAction} from '../domain/rules.js';
import {relationBetween,diplomaticScore} from '../domain/diplomacy.js';
export function familyInitiative(state:BattleState,owner:string):BattleAction|undefined{
  const seat=state.agents.findIndex(a=>a.id===owner&&a.active);
  if(seat<0||state.playerAgentId===owner||!state.characters||state.turn===0||state.turn%17!==seat%17||(state.resources[owner]??0)<120)return;
  const people=state.characters.filter(p=>p.owner===owner).sort((a,b)=>Number(b.ruler)-Number(a.ruler));
  for(const person of people)for(const partner of people){
    const action={type:'form-union' as const,personId:person.id,partnerId:partner.id,kind:'spouse' as const};
    if(validateAction(state,owner,action).ok)return action;
  }
  for(const other of state.agents.filter(a=>a.active&&a.id!==owner)){
    const relation=relationBetween(state,owner,other.id);if(relation.status==='alliance')continue;
    const treaty=relation.status==='war'?'peace' as const:'alliance' as const;
    if(diplomaticScore(state,owner,other.id,treaty,40)<0)continue;
    for(const person of people)for(const partner of state.characters.filter(p=>p.owner===other.id&&!p.ruler)){
      const action={type:'diplomacy' as const,targetAgentId:other.id,treaty,offer:40,marriage:{personId:person.id,partnerId:partner.id}};
      if(validateAction(state,owner,action).ok)return action;
    }
  }
}
