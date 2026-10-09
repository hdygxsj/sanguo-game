import type {AgentState,BattleAction,BattleState,CharacterState,DomainEvent,ValidationResult} from './types.js';
import {commandingArmy,freeCaptive,reservedCommander} from './commanders.js';
import {effectiveAttributes} from './equipment.js';
import {isMinor} from './lifecycle.js';
import {createTalents,talentCost} from './talents.js';
import {fiscalEstimate} from './economy.js';
import {tradePartners} from './diplomacy.js';
import {courtBudget,courtOffice,reconcileCourt} from './court.js';
import {talentDiscovered} from './talentRefresh.js';

type PersonnelAction=Exclude<Extract<BattleAction,{characterId:string}>,{type:'equip-equipment'|'unequip-equipment'|'appoint-court'|'dismiss-court'}>;
type Emit=(event:Omit<DomainEvent,'turn'|'sequence'>)=>void;
// Original sandbox assignments/attributes; includes literary figures, not same-year history.
const RETINUES: [string,string][] = [
  ['荀彧','卞夫人'],['关羽','甘夫人'],['程普','吴夫人'],['田丰','甄宓'],
  ['纪灵','阎象'],['吕布','貂蝉'],['蒯良','蔡夫人'],['赵韪','吴苋'],
  ['马超','马云禄'],['赵云','田楷'],['王修','太史慈'],['于毒','白绕'],
  ['陈登','糜贞'],['张英','樊能'],['阎圃','张琪瑛'],['士壹','士徽'],
];
const WOMEN=new Set(['卞夫人','甘夫人','吴夫人','甄宓','貂蝉','蔡夫人','吴苋','马云禄','糜贞','张琪瑛']);
export function createCharacters(agents:AgentState[]):CharacterState[]{
  return [...agents.flatMap((a,i)=>[a.name,...(RETINUES[i]??[])].map((name,j)=>({
    id:`person-${i+1}-${j}`,name,ageYears:30,sex:WOMEN.has(name)?'female' as const:'male' as const,
    owner:a.id,ruler:j===0,politics:j===0?75:j===1?88:72,command:j===0?80:j===1?82:65,
    loyalty:j===0?100:75,governorCityId:null,
  }))),...createTalents()];
}
export function validatePersonnel(state:BattleState,owner:string,action:PersonnelAction):ValidationResult {
  const person=state.characters?.find(c=>c.id===action.characterId);
  if(action.type==='recruit-character'){
    if(!person||person.owner!==null||person.ruler||person.capturedBy||commandingArmy(state,person.id))return {ok:false,code:'CHARACTER_NOT_AVAILABLE'};
    if(!talentDiscovered(state,person))return {ok:false,code:'CHARACTER_NOT_DISCOVERED'};
    if(isMinor(person))return {ok:false,code:'CHARACTER_UNDERAGE'};
    if((state.resources[owner]??0)<talentCost(person))return {ok:false,code:'INSUFFICIENT_RESOURCES'};
    return {ok:true};
  }
  if(action.type==='release-captive'||action.type==='recruit-captive'){
    if(!person||person.capturedBy!==owner)return {ok:false,code:'NOT_CAPTOR'};
    if(action.type==='recruit-captive'&&(state.resources[owner]??0)<(person.loyalty>50?10:30))return {ok:false,code:'INSUFFICIENT_RESOURCES'};
    return {ok:true};
  }
  if(!person||person.owner!==owner)return {ok:false,code:'CHARACTER_NOT_OWNED'};
  if(isMinor(person))return {ok:false,code:'CHARACTER_UNDERAGE'};
  if(person.capturedBy)return {ok:false,code:'CHARACTER_CAPTURED'};
  if(action.type==='appoint-governor'){
    if(courtOffice(state,person.id))return {ok:false,code:'OFFICE_CONFLICT'};
    if(commandingArmy(state,person.id))return {ok:false,code:'CHARACTER_COMMANDING'};
    const city=state.cities[action.cityId];
    if(!city||city.owner!==owner)return {ok:false,code:'NOT_OWNER'};
    if(city.terrain==='blocked')return {ok:false,code:'BLOCKED_TERRAIN'};
    if(state.characters!.some(c=>c.governorCityId===city.id))return {ok:false,code:'GOVERNOR_OCCUPIED'};
    if(person.loyalty<30)return {ok:false,code:'LOYALTY_TOO_LOW'};
    if((state.resources[owner]??0)<10)return {ok:false,code:'INSUFFICIENT_RESOURCES'};
  }else if(action.type==='dismiss-governor'){
    if(person.governorCityId===null)return {ok:false,code:'NOT_GOVERNOR'};
  }else {
    if(person.ruler||person.loyalty>=100)return {ok:false,code:'REWARD_UNNECESSARY'};
    if((state.resources[owner]??0)<15)return {ok:false,code:'INSUFFICIENT_RESOURCES'};
  }
  return {ok:true};
}
export function resolvePersonnel(state:BattleState,owner:string,action:PersonnelAction,emit:Emit){
  const person=state.characters!.find(c=>c.id===action.characterId)!;
  if(action.type==='recruit-character'){
    const cost=talentCost(person);state.resources[owner]!-=cost;person.owner=owner;person.loyalty=55;person.governorCityId=null;person.recruitedTurn=state.turn;
    emit({type:'personnel',agentId:owner,amount:cost,message:`礼聘 ${person.name} 入仕，支出 ${cost}，忠诚 55`});
  }else if(action.type==='release-captive'){
    freeCaptive(state,person);emit({type:'captive',agentId:owner,message:`释放 ${person.name}`});
  }else if(action.type==='recruit-captive'){
    if(person.loyalty>50){state.resources[owner]!-=10;person.loyalty=Math.max(0,person.loyalty-15);emit({type:'captive',agentId:owner,message:`以礼劝说 ${person.name}，耗资 10，对原主忠诚降至 ${person.loyalty}`});}
    else {state.resources[owner]!-=30;delete person.capturedBy;person.owner=owner;person.loyalty=50;emit({type:'captive',agentId:owner,message:`${person.name} 接受招降，耗资 30，忠诚 50`});}
  }else if(action.type==='appoint-governor'){
    state.resources[owner]!-=10;person.governorCityId=action.cityId;
    emit({type:'personnel',agentId:owner,cityId:action.cityId,message:`任命 ${person.name} 为 ${state.cities[action.cityId]!.name} 太守，支出 10`});
  }else if(action.type==='dismiss-governor'){
    person.governorCityId=null;if(!person.ruler)person.loyalty=Math.max(0,person.loyalty-10);
    emit({type:'personnel',agentId:owner,message:`${person.name} 卸任太守，忠诚 ${person.loyalty}`});
  }else{
    state.resources[owner]!-=15;person.loyalty=Math.min(100,person.loyalty+15);
    emit({type:'personnel',agentId:owner,message:`赏赐 ${person.name} 15，忠诚升至 ${person.loyalty}`});
  }
}
export function characterBudget(state:BattleState,owner:string){
  let salary=0,revenue=0;
  for(const person of state.characters??[])if(person.owner===owner&&!person.capturedBy){
    const serving=person.governorCityId!==null&&state.cities[person.governorCityId]?.owner===owner;
    salary+=serving?2:1;
    if(serving)revenue+=Math.min(4,Math.floor(effectiveAttributes(state,person).politics*person.loyalty/2500));
  }
  const court=courtBudget(state,owner);
  return {salary:salary+court.salary,revenue:revenue+court.revenue};
}
export function reconcileOffices(state:BattleState,emit:Emit){
  reconcileCourt(state);
  for(const p of state.characters??[])if(p.governorCityId!==null&&state.cities[p.governorCityId]?.owner!==p.owner){
    p.governorCityId=null;if(!p.ruler)p.loyalty=Math.max(0,p.loyalty-15);
    emit({type:'personnel',agentId:p.owner??undefined,message:`${p.name} 因驻地失守卸任太守`});
  }
}
export function settleCharacters(state:BattleState,owner:string,paid:boolean,emit:Emit){
  for(const p of state.characters??[])if(p.owner===owner&&!p.ruler&&!p.capturedBy&&!isMinor(p)){
    p.loyalty=Math.max(0,Math.min(100,p.loyalty+(!paid?-12:p.governorCityId!==null||courtOffice(state,p.id)?1:!commandingArmy(state,p.id)&&state.turn%4===0?-1:0)));
    if(!paid)emit({type:'personnel',agentId:owner,message:`${p.name} 因欠薪忠诚降至 ${p.loyalty}`});
    if(p.loyalty===0){p.owner=null;p.governorCityId=null;emit({type:'personnel',agentId:owner,message:`${p.name} 忠诚耗尽，辞官离开势力`});}
  }
}
export function personnelInitiative(state:BattleState,owner:string):PersonnelAction|undefined{
  if(!state.characters||state.playerAgentId===owner||state.turn===0||state.turn%7!==0||(state.resources[owner]??0)<30)return;
  const captive=state.characters.find(c=>c.capturedBy===owner);
  if(captive)return {type:'recruit-captive',characterId:captive.id};
  const people=state.characters.filter(c=>c.owner===owner&&!c.capturedBy&&!isMinor(c));
  const troubled=people.find(c=>!c.ruler&&c.loyalty<35);
  if(troubled)return {type:'reward-character',characterId:troubled.id};
  const reserved=reservedCommander(state,owner);
  const person=people.filter(c=>c.id!==reserved&&c.governorCityId===null&&!courtOffice(state,c.id)&&c.loyalty>=30&&!commandingArmy(state,c.id)).sort((a,b)=>b.politics*b.loyalty-a.politics*a.loyalty)[0];
  const city=state.cities.filter(c=>c.owner===owner&&c.terrain!=='blocked'&&!state.characters!.some(p=>p.governorCityId===c.id)).sort((a,b)=>b.level-a.level)[0];
  if(person&&city)return {type:'appoint-governor',characterId:person.id,cityId:city.id};
  // Fill a real vacant office, not a collection of expensive idle names.
  // Existing staff and loyalty problems take priority over recruitment.
  if(!city||person)return;
  const owned=state.cities.filter(c=>c.owner===owner);
  const fiscal=fiscalEstimate(owned,0,(state.armies??[]).filter(a=>a.owner===owner));
  const staff=characterBudget(state,owner);
  const net=fiscal.net+staff.revenue-staff.salary+tradePartners(state,owner).length*3-2;
  const reserve=100+Math.max(0,-net)*20;
  const recruit=state.characters.filter(c=>validatePersonnel(state,owner,{type:'recruit-character',characterId:c.id}).ok)
    .filter(c=>(state.resources[owner]??0)-talentCost(c)-10>=reserve)
    .sort((a,b)=>b.politics-a.politics||b.command-a.command||a.id.localeCompare(b.id))[0];
  if(recruit)return {type:'recruit-character',characterId:recruit.id};
}
