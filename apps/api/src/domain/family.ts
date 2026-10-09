import type {BattleAction,BattleState,DomainEvent,ValidationResult,MarriageTerms} from './types.js';
import {related} from './lifecycle.js';
type FamilyAction=Extract<BattleAction,{type:'form-union'}>;
export const unionCost=(kind:FamilyAction['kind'])=>kind==='spouse'?40:60;
export function validateFamily(s:BattleState,o:string,a:FamilyAction):ValidationResult{
  const p=s.characters?.find(p=>p.id===a.personId),q=s.characters?.find(p=>p.id===a.partnerId);
  const no=(code:string):ValidationResult=>({ok:false,code});
  if(!p||!q||p.id===q.id||p.owner!==o||q.owner!==o)return no('INVALID_FAMILY_PARTICIPANTS');
  if(s.diplomaticOffers?.some(offer=>offer.marriage&&[offer.marriage.personId,offer.marriage.partnerId].some(id=>id===p.id||id===q.id)))return no('MARRIAGE_PENDING');
  if(!Number.isFinite(p.ageYears)||!Number.isFinite(q.ageYears)||(p.ageYears??0)<18||(q.ageYears??0)<18)return no('ADULT_AGE_REQUIRED');
  if(p.capturedBy||q.capturedBy||p.loyalty<50||q.loyalty<50||s.armies?.some(x=>x.commanderId===p.id||x.commanderId===q.id))return no('FAMILY_UNAVAILABLE');
  if(p.name[0]===q.name[0]||related(s,p,q))return no('KINSHIP_RESTRICTED');
  if(p.sex===q.sex)return no('INVALID_UNION_PAIR');
  const unions=s.unions??[],pLinks=unions.filter(u=>u.personId===p.id||u.partnerId===p.id),qLinks=unions.filter(u=>u.personId===q.id||u.partnerId===q.id);
  if(a.kind==='concubine'){
    if(p.sex!=='male'||q.sex!=='female'||qLinks.length||pLinks.some(u=>u.partnerId===p.id&&u.kind==='concubine')||pLinks.filter(u=>u.kind==='concubine').length>=3)return no('HOUSEHOLD_OCCUPIED');
  }else if(pLinks.some(u=>u.kind==='spouse'||u.partnerId===p.id)||qLinks.some(u=>u.kind==='spouse'||u.partnerId===q.id)||q.sex==='female'&&qLinks.length||p.sex==='female'&&pLinks.length)return no('HOUSEHOLD_OCCUPIED');
  if((s.resources[o]??0)<unionCost(a.kind))return no('INSUFFICIENT_RESOURCES');
  return {ok:true};
}
export function validateMarriageTerms(s:BattleState,from:string,to:string,m:MarriageTerms,ignoreOfferId?:string):ValidationResult{
  const p=s.characters?.find(c=>c.id===m.personId),q=s.characters?.find(c=>c.id===m.partnerId);
  if(!p||!q||p.owner!==from||q.owner!==to||from===to||q.ruler)return {ok:false,code:'INVALID_MARRIAGE_TARGET'};
  if(s.unions?.some(u=>[u.personId,u.partnerId].some(id=>id===p.id||id===q.id)))return {ok:false,code:'HOUSEHOLD_OCCUPIED'};
  // Validate the future shared household in an immutable view; no ownership is changed here.
  const view={...s,resources:{...s.resources,[from]:40},characters:s.characters!.map(c=>c.id===q.id?{...c,owner:from}:c),diplomaticOffers:s.diplomaticOffers?.filter(o=>o.id!==ignoreOfferId)};
  return validateFamily(view,from,{type:'form-union',...m,kind:'spouse'});
}
export function enactMarriage(s:BattleState,from:string,m:MarriageTerms,emit:(e:Omit<DomainEvent,'turn'|'sequence'>)=>void){
  const p=s.characters!.find(c=>c.id===m.personId)!,q=s.characters!.find(c=>c.id===m.partnerId)!;
  q.owner=from;q.governorCityId=null;q.loyalty=Math.max(60,q.loyalty);
  for(const item of s.equipment??[])if(item.bearerId===q.id)delete item.bearerId;
  (s.unions??=[]).push({id:`union-${s.version}-${from}`,personId:p.id,partnerId:q.id,kind:'spouse',formedTurn:s.turn});
  emit({type:'family',agentId:from,message:`${p.name} 与 ${q.name} 联姻，${q.name} 迁入 ${s.agents.find(a=>a.id===from)?.name} 势力`});
}
export function resolveFamily(s:BattleState,o:string,a:FamilyAction,emit:(e:Omit<DomainEvent,'turn'|'sequence'>)=>void){
  const p=s.characters!.find(p=>p.id===a.personId)!,q=s.characters!.find(p=>p.id===a.partnerId)!;
  s.resources[o]!-=unionCost(a.kind);
  (s.unions??=[]).push({id:`union-${s.version}-${o}`,personId:p.id,partnerId:q.id,kind:a.kind,formedTurn:s.turn});
  p.loyalty=Math.min(100,p.loyalty+5);q.loyalty=Math.min(100,q.loyalty+5);
  emit({type:'family',agentId:o,message:`${p.name} 与 ${q.name} ${a.kind==='spouse'?'缔结婚姻':'建立侧室关系'}，礼仪支出 ${unionCost(a.kind)}`});
}
