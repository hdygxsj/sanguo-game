import type {ArmyState,BattleAction,BattleState,CharacterState,DomainEvent} from './types.js';
import {effectiveAttributes,transferCapturedEquipment} from './equipment.js';
import {isMinor} from './lifecycle.js';
import {courtOffice,marshalBonus} from './court.js';
import {atWar} from './diplomacy.js';
type Emit=(event:Omit<DomainEvent,'turn'|'sequence'>)=>void;
export const commandingArmy=(s:BattleState,id:string)=>s.armies?.find(a=>a.commanderId===id&&a.troops>0);
export function availableCommanders(s:BattleState,owner:string){
  return (s.characters??[]).filter(c=>c.owner===owner&&!c.capturedBy&&!isMinor(c)&&c.governorCityId===null&&(!courtOffice(s,c.id)||courtOffice(s,c.id)==='marshal')&&c.loyalty>=30&&!commandingArmy(s,c.id));
}
/** Keep one mobilisable commander out of AI civil appointments during a war. */
export function reservedCommander(s:BattleState,owner:string){
  if(!s.agents.some(a=>a.active&&a.id!==owner&&atWar(s,owner,a.id)))return;
  return availableCommanders(s,owner).sort((a,b)=>effectiveAttributes(s,b).command-effectiveAttributes(s,a).command||a.id.localeCompare(b.id))[0]?.id;
}
export function commandMultiplier(s:BattleState,army:ArmyState){
  const c=s.characters?.find(c=>c.id===army.commanderId&&c.owner===army.owner&&!c.capturedBy);
  return 1+(c?effectiveAttributes(s,c).command/500:0)+marshalBonus(s,army.owner);
}
export function captureCommander(s:BattleState,army:ArmyState,captor:string|null,emit:Emit){
  const c=s.characters?.find(c=>c.id===army.commanderId&&c.owner===army.owner&&!c.capturedBy);
  if(!c)return;
  if(c.ruler||!captor){emit({type:'captive',agentId:army.owner,message:`${c.name} 败军后脱身，返回势力`});return;}
  c.capturedBy=captor;c.governorCityId=null;
  transferCapturedEquipment(s,c.id,captor);
  emit({type:'captive',agentId:captor,message:`俘获 ${c.name}，原属 ${s.agents.find(a=>a.id===c.owner)?.name}`});
}
export function freeCaptive(s:BattleState,c:CharacterState){
  delete c.capturedBy;c.governorCityId=null;
  if(!s.agents.some(a=>a.id===c.owner&&a.active))c.owner=null;
}
export function freeDefeatedCaptors(s:BattleState,emit:Emit){
  for(const c of s.characters??[])if(c.capturedBy&&!s.agents.some(a=>a.id===c.capturedBy&&a.active)){
    const captor=c.capturedBy;freeCaptive(s,c);emit({type:'captive',agentId:captor,message:`羁押势力覆灭，${c.name} 获释`});
  }
}
export function withCommander(s:BattleState,owner:string,action:BattleAction):BattleAction{
  if(action.type!=='move'&&action.type!=='attack')return action;
  const commander=availableCommanders(s,owner).sort((a,b)=>effectiveAttributes(s,b).command-effectiveAttributes(s,a).command)[0];
  return commander?{...action,commanderId:commander.id}:action;
}
