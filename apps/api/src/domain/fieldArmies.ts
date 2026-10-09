import type {ArmyState,BattleAction,BattleState,DomainEvent,ValidationResult,UnitType} from './types.js';
import {roadRoute,MARCH_SPEED,weatherModifier} from './marching.js';
import {terrainTravelCost} from './campaignTerrain.js';
import {availableCommanders} from './commanders.js';
import {atWar} from './diplomacy.js';
import {detachTroops,mergeTroops,UNIT_RULES,UNIT_TYPES} from './troops.js';
import {recruitmentPrice} from './construction.js';
import {formatTroops} from './troopScale.js';
type Action=Extract<BattleAction,{type:'raise-army'|'order-army'|'army-stance'|'recruit-army'}>;
type Emit=(e:Omit<DomainEvent,'turn'|'sequence'>)=>void;
export const isArmyAction=(a:BattleAction):a is Action=>['raise-army','order-army','army-stance','recruit-army'].includes(a.type);
export function armySupplyCity(state:BattleState,a:ArmyState){
 const from=state.cities[a.route[a.leg]!],to=state.cities[a.route[a.leg+1]!];
 if(!a.halted||!from||!to)return undefined;
 if(a.progress<1e-8&&from.owner===a.owner)return from;
 if(a.progress>1-1e-8&&to.owner===a.owner)return to;
 return from.owner===a.owner&&to.owner===a.owner?from:undefined;
}
/** Re-plan from the current road position; reversing an edge complements progress. */
export function planArmyOrder(state:BattleState,a:ArmyState,to:number,stopProgress?:number){
 const from=a.route[a.leg]!,next=a.route[a.leg+1]!;
 const candidates:{route:number[];progress:number;cost:number}[]=[];
 const legCost=(x:number,y:number)=>terrainTravelCost(state,x,y)/weatherModifier(state.cities[y]!.weather);
 const add=(node:number,reverse:boolean)=>{
  const tail=node===to?[node]:roadRoute(state,node,to,a.owner);if(!tail)return;
  const p=reverse?1-a.progress:a.progress;
  let route=from===next||p>=1-1e-8?tail:[reverse?next:from,...tail];
  let progress=route===tail?0:p;
  if(route.length<2)return;
  if(stopProgress!==undefined&&route.length===2&&progress>=stopProgress)return;
  const cost=route.slice(1).reduce((sum,n,i)=>sum+legCost(route[i]!,n)*((i===route.length-2?stopProgress??1:1)-(i===0?progress:0)),0);
  if(Number.isFinite(cost))candidates.push({route,progress,cost});
 };
 if(from===next)add(from,false);else{add(next,false);add(from,true);}
 return candidates.sort((a,b)=>a.cost-b.cost)[0]??null;
}
export function validateArmyAction(s:BattleState,owner:string,a:Action):ValidationResult{
 const fail=(code:string):ValidationResult=>({ok:false,code});
 if(a.type==='raise-army'){
  const c=s.cities[a.cityId];if(!c||c.owner!==owner)return fail('NOT_OWNER');
  if(c.siteKind&&c.siteKind!=='city')return fail('CITY_REQUIRED');
  if(c.troops<7)return fail('GARRISON_TOO_SMALL');
  if(a.commanderId&&!availableCommanders(s,owner).some(c=>c.id===a.commanderId))return fail('COMMANDER_UNAVAILABLE');
  return {ok:true};
 }
 const army=s.armies?.find(x=>x.id===a.armyId&&x.owner===owner);if(!army)return fail('ARMY_NOT_OWNED');
 if(a.type==='army-stance'){
  if(a.stance==='ambush'&&(army.progress<=.001||army.progress>=.999||army.route[army.leg]===army.route[army.leg+1]))return fail('AMBUSH_REQUIRES_FIELD');
 }else if(a.type==='recruit-army'){
  if(!Number.isInteger(a.amount)||a.amount<1||a.amount>100)return fail('INVALID_AMOUNT');
  if(a.unitType&&!UNIT_TYPES.includes(a.unitType))return fail('INVALID_UNIT_TYPE');
  const city=armySupplyCity(s,army);if(!city)return fail('ARMY_NEEDS_FRIENDLY_CAMP');
  if((s.resources[owner]??0)<a.amount*recruitmentPrice(city,a.unitType??'spear'))return fail('INSUFFICIENT_RESOURCES');
 }else{
  const target=s.cities[a.toCityId];if(!target)return fail('CITY_NOT_FOUND');
  if(a.stopProgress!==undefined&&(!Number.isFinite(a.stopProgress)||a.stopProgress<.1||a.stopProgress>.9))return fail('INVALID_WAYPOINT');
  if(target.owner&&target.owner!==owner&&!atWar(s,owner,target.owner))return fail('NOT_AT_WAR');
  if(!planArmyOrder(s,army,a.toCityId,a.stopProgress))return fail('NO_ROAD_ROUTE');
 }
 return {ok:true};
}
export type ArmyRecruit={armyId:string;owner:string;amount:number;unitType:UnitType;cost:number};
export function resolveArmyAction(s:BattleState,owner:string,a:Action,emit:Emit,recruits:ArmyRecruit[]){
 if(a.type==='raise-army'){
  const city=s.cities[a.cityId]!,units=detachTroops(city,6);
  const army:ArmyState={id:`field-${s.version}-${owner}`,name:`${city.name}军`,owner,troops:6,units,route:[city.id,city.id],leg:0,progress:0,speed:MARCH_SPEED,persistent:true,stance:'camp',halted:true,remainingTurns:0};
  if(a.commanderId)army.commanderId=a.commanderId;
  (s.armies??=[]).push(army);emit({type:'march',armyId:army.id,agentId:owner,cityId:city.id,message:`${army.name} 成军，守军 600 人编入独立兵团，可选择军队征募、行军或驻扎。`});return;
 }
 const army=s.armies!.find(x=>x.id===a.armyId)!;army.persistent=true;
 if(a.type==='order-army'){
  const plan=planArmyOrder(s,army,a.toCityId,a.stopProgress)!;
  army.route=plan.route;army.progress=plan.progress;army.leg=0;army.halted=false;army.stance='march';army.stopProgress=a.stopProgress;delete army.blockedReason;
  emit({type:'march',agentId:owner,armyId:army.id,toCityId:a.toCityId,message:`${army.name??army.id} 向 ${s.cities[a.toCityId]!.name}${a.stopProgress!==undefined?'方向的野外驻扎点':'进军'}，沿道路行军。`});
 }else if(a.type==='army-stance'){
  army.halted=true;army.stance=a.stance;delete army.stopProgress;
  emit({type:'march',agentId:owner,armyId:army.id,message:`${army.name??army.id} 原地${a.stance==='ambush'?'设伏，敌军通过时发动伏击':'扎营待命'}。`});
 }else{
  const unitType=a.unitType??'spear',city=armySupplyCity(s,army)!,cost=a.amount*recruitmentPrice(city,unitType);
  s.resources[owner]!-=cost;recruits.push({armyId:army.id,owner,amount:a.amount,unitType,cost});
  army.stance='camp';
 }
}
export function settleArmyRecruits(s:BattleState,recruits:ArmyRecruit[],emit:Emit){
 for(const r of recruits){const army=s.armies?.find(a=>a.id===r.armyId&&a.owner===r.owner);
  if(!army||!armySupplyCity(s,army)){s.resources[r.owner]!+=r.cost;emit({type:'recruit',agentId:r.owner,armyId:r.armyId,message:`部队覆灭或补给线中断，征募取消，退还 ${r.cost}`});continue;}
  mergeTroops(army,{troops:r.amount,units:{[r.unitType]:r.amount}});emit({type:'recruit',agentId:r.owner,armyId:army.id,amount:r.amount,message:`${army.name??army.id} 战后补入 ${UNIT_RULES[r.unitType].name} ${formatTroops(r.amount)} 人，下回合可参战。`});
 }
}
