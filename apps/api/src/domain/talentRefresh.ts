import type {BattleState,CharacterState} from './types.js';
import {rosterHash} from './historicalRoster.js';
import {createRandomOfficers} from './randomOfficers.js';

export function talentDiscovered(state:BattleState,p:CharacterState){
 return !p.id.startsWith('historic-')||!state.discoveredTalentIds||state.discoveredTalentIds.includes(p.id);
}
export function refreshTalents(state:BattleState){
 if(!state.characters||state.talentRefreshTurn===state.turn)return;
 const protectedIds=new Set<string>();
 for(const u of state.unions??[]){protectedIds.add(u.personId);protectedIds.add(u.partnerId);}
 for(const offer of state.diplomaticOffers??[])if(offer.marriage){protectedIds.add(offer.marriage.personId);protectedIds.add(offer.marriage.partnerId);}
 for(const p of state.characters)for(const id of p.parentIds??[])protectedIds.add(id);
 for(const a of state.armies??[])if(a.commanderId)protectedIds.add(a.commanderId);
 for(const e of state.equipment??[])if(e.bearerId)protectedIds.add(e.bearerId);
 for(const offices of Object.values(state.court??{}))for(const id of Object.values(offices))if(id)protectedIds.add(id);
 for(const p of state.characters)if(p.origin==='generated'&&p.owner!==null)p.recruitedTurn??=state.turn;
 const oldNames=state.characters.map(p=>p.name);
 state.characters=state.characters.filter(p=>p.origin!=='generated'||p.owner!==null||p.recruitedTurn!==undefined||p.capturedBy||p.ruler||p.governorCityId!==null||protectedIds.has(p.id));
 const batch=createRandomOfficers(`${state.seed}:turn:${state.turn}`,oldNames,6);
 batch.forEach((p,i)=>{p.id=`random-v2-${state.turn}-${i+1}`;});
 state.characters.push(...batch);
 state.discoveredTalentIds=state.characters.filter(p=>p.id.startsWith('historic-')&&p.owner===null&&!p.capturedBy)
  .sort((a,b)=>rosterHash(`${state.seed}:${state.turn}:${a.id}`)-rosterHash(`${state.seed}:${state.turn}:${b.id}`)||a.id.localeCompare(b.id)).slice(0,8).map(p=>p.id);
 state.talentRefreshTurn=state.turn;
}
