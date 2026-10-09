import type {BattleAction,BattleState,DiplomaticRelation,DomainEvent,Treaty,ValidationResult} from './types.js';
import {validateMarriageTerms,enactMarriage} from './family.js';
import {detachTroops,troopMultiplier} from './troops.js';
import {weatherModifier} from './marching.js';

type Emit=(event:Omit<DomainEvent,'sequence'|'turn'>)=>void;
export const relationKey=(a:string,b:string)=>[a,b].sort().join(':');
export const relationBetween=(state:BattleState,a:string,b:string):DiplomaticRelation=>state.diplomacy?.[relationKey(a,b)]??{status:'war',relation:-20,trade:false,truceUntil:0};
export const atWar=(state:BattleState,a:string,b:string)=>a!==b&&relationBetween(state,a,b).status==='war';
/** AI planning grace, not a treaty expiry: actual war still requires a legal order.
 * Alliances receive a much longer commitment than a simple ceasefire. */
export function mayReassessTreaty(state:BattleState,a:string,b:string):boolean {
  const relation=relationBetween(state,a,b);
  return relation.status!=='war'&&state.turn>=relation.truceUntil+(relation.status==='alliance'?40:12);
}
export const factionStrength=(state:BattleState,id:string)=>state.cities.filter(c=>c.owner===id).reduce((sum,c)=>sum+c.troops+c.level*4,0)+(state.armies??[]).filter(a=>a.owner===id).reduce((sum,a)=>sum+a.troops,0);
export const tradePartners=(state:BattleState,id:string)=>state.cities.some(c=>c.owner===id)?state.agents.filter(a=>a.id!==id&&a.active&&state.cities.some(c=>c.owner===a.id)&&relationBetween(state,id,a.id).trade&&relationBetween(state,id,a.id).status!=='war'):[];
export const treatyNames:Record<Treaty,string>={war:'宣战',peace:'停战',alliance:'结盟',trade:'通商'};

function validTerms(state:BattleState,from:string,to:string,treaty:Treaty):ValidationResult {
  if(from===to||!state.agents.some(a=>a.id===from&&a.active)||!state.agents.some(a=>a.id===to&&a.active))return {ok:false,code:'INVALID_DIPLOMATIC_TARGET'};
  const relation=relationBetween(state,from,to);
  if(treaty==='alliance'&&(state.polities?.[from]?.kingdom||state.polities?.[to]?.kingdom))return {ok:false,code:'KINGDOM_ALLIANCE_FORBIDDEN'};
  if(treaty==='war')return relation.status==='war'?{ok:false,code:'ALREADY_AT_WAR'}:state.turn<relation.truceUntil?{ok:false,code:'TRUCE_ACTIVE'}:{ok:true};
  if(treaty==='peace')return relation.status==='war'?{ok:true}:{ok:false,code:'ALREADY_AT_PEACE'};
  if(relation.status==='war')return {ok:false,code:'PEACE_REQUIRED'};
  if(treaty==='alliance')return relation.status==='alliance'?{ok:false,code:'ALREADY_ALLIED'}:{ok:true};
  if(relation.trade)return {ok:false,code:'ALREADY_TRADING'};
  if(tradePartners(state,from).length>=3||tradePartners(state,to).length>=3)return {ok:false,code:'TRADE_LIMIT'};
  if(!state.cities.some(c=>c.owner===from)||!state.cities.some(c=>c.owner===to))return {ok:false,code:'TRADE_CITY_REQUIRED'};
  return {ok:true};
}

export function validateDiplomacy(state:BattleState,from:string,action:Extract<BattleAction,{type:'diplomacy'|'respond-diplomacy'}>):ValidationResult {
  if(action.type==='respond-diplomacy') {
    const offer=state.diplomaticOffers?.find(o=>o.id===action.offerId&&o.to===from);
    if(!offer)return {ok:false,code:'OFFER_NOT_FOUND'};
    if(action.accept&&offer.marriage){const marriage=validateMarriageTerms(state,offer.from,from,offer.marriage,offer.id);if(!marriage.ok)return marriage;}
    return action.accept?validTerms(state,offer.from,from,offer.treaty):{ok:true};
  }
  if(!Number.isInteger(action.offer)||action.offer<0||action.offer>(state.resources[from]??0))return {ok:false,code:'INSUFFICIENT_RESOURCES'};
  if(action.marriage){
    if(!['peace','alliance'].includes(action.treaty)||action.offer<40)return {ok:false,code:'INVALID_MARRIAGE_TERMS'};
    const marriage=validateMarriageTerms(state,from,action.targetAgentId,action.marriage);if(!marriage.ok)return marriage;
  }
  if(action.treaty==='war'&&action.offer!==0)return {ok:false,code:'INVALID_WAR_GIFT'};
  if(state.diplomaticOffers?.some(o=>o.from===from&&o.to===action.targetAgentId))return {ok:false,code:'OFFER_PENDING'};
  return validTerms(state,from,action.targetAgentId,action.treaty);
}

export function diplomaticScore(state:BattleState,from:string,to:string,treaty:Treaty,offer:number) {
  const power=Math.max(-30,Math.min(30,(factionStrength(state,from)/Math.max(1,factionStrength(state,to))-1)*30));
  return relationBetween(state,from,to).relation+Math.min(40,offer/2)+power+(treaty==='peace'?15:treaty==='alliance'?-35:10);
}

function enact(state:BattleState,from:string,to:string,treaty:Treaty,offer:number,escrow:boolean,emit:Emit) {
  const old=relationBetween(state,from,to),next={...old};
  if(!escrow)state.resources[from]=(state.resources[from]??0)-offer;
  state.resources[to]=(state.resources[to]??0)+offer;
  if(treaty==='war'){next.status='war';next.trade=false;next.relation=-70;}
  else if(treaty==='peace'){next.status='peace';next.truceUntil=state.turn+6;next.relation=Math.max(0,old.relation)+10;}
  else if(treaty==='alliance'){next.status='alliance';next.truceUntil=state.turn+8;next.relation=Math.min(100,old.relation+20);}
  else {next.trade=true;next.relation=Math.min(100,old.relation+10);}
  (state.diplomacy??={})[relationKey(from,to)]=next;
  const name=(id:string)=>state.agents.find(a=>a.id===id)?.name??id;
  emit({type:'diplomacy',agentId:from,amount:offer,message:`${name(from)} 与 ${name(to)}：${treatyNames[treaty]}${offer?`，交付礼金 ${offer}`:''}${treaty==='peace'||treaty==='alliance'?`，约期至第 ${next.truceUntil} 回合`:''}`});
}

export function resolveDiplomacy(state:BattleState,from:string,action:Extract<BattleAction,{type:'diplomacy'|'respond-diplomacy'}>,emit:Emit) {
  if(action.type==='respond-diplomacy') {
    const pending=state.diplomaticOffers!.find(o=>o.id===action.offerId)!;
    if(action.accept){enact(state,pending.from,pending.to,pending.treaty,pending.offer,true,emit);if(pending.marriage)enactMarriage(state,pending.from,pending.marriage,emit);}
    else {state.resources[pending.from]=(state.resources[pending.from]??0)+pending.offer;emit({type:'diplomacy',agentId:from,message:'拒绝外交提议，礼金退还提议方'});}
    state.diplomaticOffers=state.diplomaticOffers!.filter(o=>o.id!==pending.id);return;
  }
  const {targetAgentId:to,treaty,offer}=action;
  if(treaty!=='war'&&to===state.playerAgentId) {
    state.resources[from]=(state.resources[from]??0)-offer;
    (state.diplomaticOffers??=[]).push({id:`offer-${state.version}-${from}-${to}`,from,to,treaty,offer,expiresTurn:state.turn+3,...(action.marriage?{marriage:action.marriage}:{})});
    emit({type:'diplomacy',agentId:from,amount:offer,message:`${state.agents.find(a=>a.id===from)?.name} 提议${treatyNames[treaty]}，礼金 ${offer} 已托管，等待君主答复`});return;
  }
  if(treaty==='war'||diplomaticScore(state,from,to,treaty,offer)>=0){enact(state,from,to,treaty,offer,false,emit);if(action.marriage)enactMarriage(state,from,action.marriage,emit);}
  else emit({type:'diplomacy',agentId:from,message:`${state.agents.find(a=>a.id===to)?.name} 拒绝${treatyNames[treaty]}，未扣除礼金`});
}

export function settleDiplomacy(state:BattleState,emit:Emit) {
  state.diplomaticOffers=(state.diplomaticOffers??[]).filter(o=>{
    if(o.expiresTurn>state.turn&&state.agents.some(a=>a.id===o.to&&a.active)&&state.agents.some(a=>a.id===o.from&&a.active))return true;
    state.resources[o.from]=(state.resources[o.from]??0)+o.offer;
    emit({type:'diplomacy',agentId:o.from,amount:o.offer,message:`外交提议失效，退还礼金 ${o.offer}`});return false;
  });
}

/** Small transparent diplomatic policy alongside the learned military policy. */
export function diplomaticInitiative(state:BattleState,id:string):BattleAction|undefined {
  if(state.playerAgentId===id||state.diplomacy===undefined||state.turn%7!==state.agents.findIndex(a=>a.id===id)%7)return;
  const strength=factionStrength(state,id),money=state.resources[id]??0;
  const owned=state.cities.filter(c=>c.owner===id&&c.terrain!=='blocked');
  const hasFront=owned.some(c=>c.adjacent.some(n=>{const next=state.cities[n];return next&&next.terrain!=='blocked'&&next.owner!==id&&(!next.owner||atWar(state,id,next.owner));}));
  // An enclosed near-peer can reassess an old treaty; active fronts and the
  // longer alliance commitment take priority over opportunistic expansion.
  if(!hasFront&&money>=40){
    for(const other of state.agents.filter(a=>a.active&&a.id!==id)){
      if(!mayReassessTreaty(state,id,other.id)||strength<factionStrength(state,other.id)*.9)continue;
      const viable=owned.some(source=>source.adjacent.some(n=>{
        const target=state.cities[n];if(!target||target.owner!==other.id||target.terrain==='blocked')return false;
        const troops=source.troops-Math.max(2,Math.ceil(source.troops*.15));if(troops<2)return false;
        const copy={troops:source.troops,units:source.units},army={troops,units:detachTroops(copy,troops)};
        return troops*weatherModifier(target.weather)*troopMultiplier(army,target,true)>target.troops*target.defenseMultiplier*troopMultiplier(target,army)*1.35;
      }));
      const action:Extract<BattleAction,{type:'diplomacy'}>={type:'diplomacy',targetAgentId:other.id,treaty:'war',offer:0};
      if(viable&&validateDiplomacy(state,id,action).ok)return action;
    }
  }
  for(const other of state.agents.filter(a=>a.active&&a.id!==id)) {
    const relation=relationBetween(state,id,other.id),theirStrength=factionStrength(state,other.id);
    let action:Extract<BattleAction,{type:'diplomacy'}>|undefined;
    if(relation.status==='war'&&strength<theirStrength*.75&&money>=30)action={type:'diplomacy',targetAgentId:other.id,treaty:'peace',offer:30};
    else if(relation.status!=='war'&&!relation.trade)action={type:'diplomacy',targetAgentId:other.id,treaty:'trade',offer:0};
    else if(relation.status==='peace'&&state.turn>=relation.truceUntil&&strength>theirStrength*1.6&&state.cities.some(c=>c.owner===id&&c.adjacent.some(n=>state.cities[n]?.owner===other.id)))action={type:'diplomacy',targetAgentId:other.id,treaty:'war',offer:0};
    if(action&&validateDiplomacy(state,id,action).ok&&(action.treaty==='war'||diplomaticScore(state,id,other.id,action.treaty,action.offer)>=0))return action;
  }
}
