import type {BattleAction,BattleState,DomainEvent,ValidationResult} from './types.js';
import {HISTORICAL_FACTIONS} from './factions.js';
import {fiscalEstimate} from './economy.js';
import {factionBonus,factionTrait} from './factionTraits.js';

type Emit=(event:Omit<DomainEvent,'sequence'|'turn'>)=>void;
export const KINGDOM_RULES={prestige:300,sites:6,cost:200,duration:40,cooldown:8,migrationBase:200,prestigeLoss:100} as const;
export const kingdomOf=(state:BattleState,id:string)=>state.polities?.[id]?.kingdom;
export function rankName(state:BattleState,id:string){
  if(kingdomOf(state,id))return '王';
  if(state.polities?.[id]?.fallen)return '公';
  return ['士族','男','子','伯','侯','公'][Math.min(5,Math.floor((state.polities?.[id]?.prestige??0)/60))]!;
}
export function initialCapital(state:BattleState,id:string){
  const agent=state.agents.find(a=>a.id===id);
  if(agent?.startingCityId!==undefined)return state.cities.find(c=>c.id===agent.startingCityId);
  const origin=HISTORICAL_FACTIONS.find(f=>f.name===agent?.name);
  const seat=state.map?.commanderies.find(c=>c.name===origin?.commandery)?.seatId;
  if(seat!==undefined)return state.cities.find(c=>c.id===seat);
  // Legacy generated boards have no historical metadata; pin the oldest owned city on first settlement.
  return state.cities.find(c=>c.owner===id&&(!c.siteKind||c.siteKind==='city'));
}
export const migrationCost=(state:BattleState,cityId:number)=>KINGDOM_RULES.migrationBase+20*(state.cities[cityId]?.level??0);
export function prestigeGain(state:BattleState,id:string){
  const cities=state.cities.filter(c=>c.owner===id),armies=(state.armies??[]).filter(a=>a.owner===id);
  const fiscal=fiscalEstimate(cities,0,armies),bonus=factionBonus(state,id,cities,armies);
  const gain={economy:Math.min(6,Math.floor((fiscal.revenue+bonus.estates+bonus.trade)/12)),territory:Math.min(6,Math.floor(cities.length/3)),
    military:Math.min(4,Math.floor([...cities,...armies].reduce((s,c)=>s+c.troops,0)/40)),
    construction:Math.min(4,Math.floor(cities.reduce((s,c)=>s+c.level-1+Object.values(c.buildings??{}).reduce((n,v)=>n+v,0),0)/3)),trait:0,total:0};
  const source=factionTrait(state.agents.find(a=>a.id===id)?.name??'').prestige;
  if(source&&gain[source]>0)gain.trait=1;
  gain.total=gain.economy+gain.territory+gain.military+gain.construction+gain.trait;
  return gain;
}
export const isKingdomAction=(a:BattleAction):a is Extract<BattleAction,{type:'found-kingdom'|'move-capital'}>=>a.type==='found-kingdom'||a.type==='move-capital';
export function validateKingdom(state:BattleState,id:string,action:Extract<BattleAction,{type:'found-kingdom'|'move-capital'}>):ValidationResult{
  const fail=(code:string):ValidationResult=>({ok:false,code}),polity=state.polities?.[id],kingdom=polity?.kingdom;
  if(action.type==='found-kingdom'){
    if(kingdom)return fail('ALREADY_KINGDOM');
    if(!/^[\p{Script=Han}]{1,6}$/u.test(action.name))return fail('INVALID_KINGDOM_NAME');
    if(Object.values(state.polities??{}).some(p=>p.kingdom?.name===action.name))return fail('KINGDOM_NAME_TAKEN');
    if((polity?.refoundAfterTurn??0)>state.turn)return fail('REFOUND_COOLDOWN');
    if((polity?.prestige??0)<KINGDOM_RULES.prestige)return fail('PRESTIGE_REQUIRED');
    if(state.cities.filter(c=>c.owner===id).length<KINGDOM_RULES.sites)return fail('KINGDOM_TERRITORY_REQUIRED');
    const origin=initialCapital(state,id);
    if(!origin||origin.owner!==id||origin.terrain==='blocked'||(origin.siteKind&&origin.siteKind!=='city'))return fail('INITIAL_CAPITAL_REQUIRED');
    if((state.resources[id]??0)<KINGDOM_RULES.cost)return fail('INSUFFICIENT_RESOURCES');
  }else{
    if(!kingdom)return fail('KINGDOM_REQUIRED');
    if(state.cities[kingdom.capitalId]?.owner!==id)return fail('CAPITAL_LOST');
    if(state.turn<kingdom.lastMigrationTurn+KINGDOM_RULES.cooldown)return fail('MIGRATION_COOLDOWN');
    const city=state.cities[action.cityId];
    if(!city||city.owner!==id||city.terrain==='blocked'||(city.siteKind&&city.siteKind!=='city'))return fail('CAPITAL_CITY_REQUIRED');
    if(city.id===kingdom.capitalId)return fail('ALREADY_CAPITAL');
    if((state.resources[id]??0)<migrationCost(state,city.id))return fail('INSUFFICIENT_RESOURCES');
  }
  return {ok:true};
}
export function resolveKingdom(state:BattleState,id:string,action:Extract<BattleAction,{type:'found-kingdom'|'move-capital'}>,emit:Emit){
  const polity=(state.polities??={})[id]??={prestige:0};
  if(action.type==='move-capital'){
    const cost=migrationCost(state,action.cityId);state.resources[id]!-=cost;
    polity.kingdom!.capitalId=action.cityId;polity.kingdom!.lastMigrationTurn=state.turn;
    emit({type:'kingdom',agentId:id,cityId:action.cityId,amount:cost,message:`${polity.kingdom!.name}国迁都 ${state.cities[action.cityId]!.name}，耗资 ${cost}，立国年限保留`});return;
  }
  const city=initialCapital(state,id)!;
  state.resources[id]!-=KINGDOM_RULES.cost;
  polity.kingdom={name:action.name,capitalId:city.id,foundedTurn:state.turn,lastMigrationTurn:state.turn};delete polity.fallen;
  for(const other of state.agents){
    const relation=state.diplomacy?.[[id,other.id].sort().join(':')];
    if(other.id!==id&&relation?.status==='alliance'){relation.status='war';relation.trade=false;relation.truceUntil=0;relation.relation=-50;
      emit({type:'diplomacy',agentId:id,message:`立国解除与 ${other.name} 的联盟及商约，双方进入交战状态`});}
  }
  state.diplomaticOffers=(state.diplomaticOffers??[]).filter(o=>{
    if(o.treaty!=='alliance'||(o.from!==id&&o.to!==id))return true;
    state.resources[o.from]=(state.resources[o.from]??0)+o.offer;
    emit({type:'diplomacy',agentId:o.from,amount:o.offer,message:`立国使联盟提议失效，退还礼金 ${o.offer}`});return false;
  });
  emit({type:'kingdom',agentId:id,cityId:city.id,amount:KINGDOM_RULES.cost,message:`${state.agents.find(a=>a.id===id)?.name} 立${action.name}国，定都 ${city.name}。自下回合起存续 40 回合可获胜；首都失守立即亡国`});
}
export function collapseKingdoms(state:BattleState,emit:Emit){
  for(const [id,p] of Object.entries(state.polities??{}))if(p.kingdom&&state.cities[p.kingdom.capitalId]?.owner!==id){
    const country=p.kingdom;delete p.kingdom;p.fallen=true;p.prestige=Math.max(0,p.prestige-KINGDOM_RULES.prestigeLoss);p.refoundAfterTurn=state.turn+KINGDOM_RULES.cooldown;
    emit({type:'kingdom',agentId:id,cityId:country.capitalId,message:`${country.name}国首都失守，国家灭亡，降为公；名望 −100，立国进度清零，最早第 ${p.refoundAfterTurn} 回合可重新立国`});
  }
}
export function settleKingdoms(state:BattleState,emit:Emit){
  collapseKingdoms(state,emit);
  for(const agent of state.agents){
    if(!agent.active)continue;
    if(agent.startingCityId===undefined)agent.startingCityId=initialCapital(state,agent.id)?.id;
    const gain=prestigeGain(state,agent.id),p=(state.polities??={})[agent.id]??={prestige:0},old=rankName(state,agent.id);
    p.prestige+=gain.total;
    if(old!==rankName(state,agent.id))emit({type:'prestige',agentId:agent.id,amount:gain.total,message:`${agent.name} 名望 ${p.prestige}，晋为${rankName(state,agent.id)}`});
  }
  const eligible=state.agents.filter(a=>a.active&&kingdomOf(state,a.id)&&state.turn-kingdomOf(state,a.id)!.foundedTurn>=KINGDOM_RULES.duration)
    .sort((a,b)=>kingdomOf(state,a.id)!.foundedTurn-kingdomOf(state,b.id)!.foundedTurn||(state.polities![b.id]!.prestige-state.polities![a.id]!.prestige)||a.id.localeCompare(b.id));
  if(eligible[0]){const id=eligible[0].id;state.status='completed';state.winner=id;state.victoryReason='kingdom';
    emit({type:'victory',agentId:id,message:`${kingdomOf(state,id)!.name}国存续十年（40 回合），${eligible[0].name} 赢得立国胜利`});}
}
