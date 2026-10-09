import type {ArmyState,BattleAction,BattleState,CharacterState,DomainEvent,EquipmentSlot,ValidationResult} from './types.js';
import {isMinor} from './lifecycle.js';
export interface EquipmentDefinition {id:string;name:string;slot:EquipmentSlot;price:number;command:number;politics:number;speed:number;unique:boolean}
// Historical/literary names with original game effects; not claims about real artifacts.
export const EQUIPMENT_CATALOG:EquipmentDefinition[]=[
  {id:'iron-sword',name:'环首刀',slot:'weapon',price:35,command:5,politics:0,speed:0,unique:false},
  {id:'war-horse',name:'良驹',slot:'mount',price:50,command:0,politics:0,speed:.08,unique:false},
  {id:'governance-scroll',name:'治政简牍',slot:'treasure',price:35,command:0,politics:8,speed:0,unique:false},
  {id:'seven-star',name:'七星宝刀',slot:'weapon',price:100,command:12,politics:0,speed:0,unique:true},
  {id:'green-dragon',name:'青龙偃月刀',slot:'weapon',price:120,command:15,politics:0,speed:0,unique:true},
  {id:'sky-piercer',name:'方天画戟',slot:'weapon',price:120,command:15,politics:0,speed:0,unique:true},
  {id:'red-hare',name:'赤兔',slot:'mount',price:120,command:3,politics:0,speed:.15,unique:true},
  {id:'dilu',name:'的卢',slot:'mount',price:100,command:2,politics:0,speed:.12,unique:true},
  {id:'jueying',name:'绝影',slot:'mount',price:100,command:2,politics:0,speed:.12,unique:true},
  {id:'art-of-war',name:'孙子兵法',slot:'treasure',price:100,command:6,politics:12,speed:0,unique:true},
];
export const equipmentDefinition=(id:string)=>EQUIPMENT_CATALOG.find(d=>d.id===id);
export type EquipmentAction=Extract<BattleAction,{type:'buy-equipment'|'equip-equipment'|'unequip-equipment'}>;
export const isEquipmentAction=(a:BattleAction):a is EquipmentAction=>a.type==='buy-equipment'||a.type==='equip-equipment'||a.type==='unequip-equipment';
export function effectiveAttributes(s:BattleState,c:CharacterState){
  let command=c.command,politics=c.politics,speed=0;
  if(!c.capturedBy)for(const item of s.equipment??[])if(item.owner===c.owner&&item.bearerId===c.id){
    const d=equipmentDefinition(item.templateId);if(d){command+=d.command;politics+=d.politics;speed+=d.speed;}
  }
  return {command:Math.min(100,Math.max(0,command)),politics:Math.min(100,Math.max(0,politics)),speed:Math.min(.15,Math.max(0,speed))};
}
export function marchEquipmentMultiplier(s:BattleState,a:ArmyState){
  const c=s.characters?.find(c=>c.id===a.commanderId&&c.owner===a.owner&&!c.capturedBy);
  return 1+(c?effectiveAttributes(s,c).speed:0);
}
export function validateEquipment(s:BattleState,owner:string,a:EquipmentAction):ValidationResult{
  if(a.type==='buy-equipment'){
    const d=equipmentDefinition(a.templateId);
    if(!d)return {ok:false,code:'ITEM_UNKNOWN'};
    if(!s.characters||!s.cities.some(c=>c.owner===owner))return {ok:false,code:'EQUIPMENT_CITY_REQUIRED'};
    if(d.unique&&s.equipment?.some(i=>i.templateId===d.id))return {ok:false,code:'ITEM_SOLD'};
    if((s.resources[owner]??0)<d.price)return {ok:false,code:'INSUFFICIENT_RESOURCES'};
    return {ok:true};
  }
  const c=s.characters?.find(c=>c.id===a.characterId&&c.owner===owner);
  if(!c||c.capturedBy||isMinor(c))return {ok:false,code:'BEARER_UNAVAILABLE'};
  if(s.armies?.some(army=>army.commanderId===c.id&&army.troops>0))return {ok:false,code:'BEARER_MARCHING'};
  if(a.type==='equip-equipment'){
    const item=s.equipment?.find(i=>i.id===a.itemId&&i.owner===owner);
    if(!item||item.bearerId||!equipmentDefinition(item.templateId))return {ok:false,code:'ITEM_UNAVAILABLE'};
  }else if(!s.equipment?.some(i=>i.owner===owner&&i.bearerId===c.id&&equipmentDefinition(i.templateId)?.slot===a.slot))return {ok:false,code:'SLOT_EMPTY'};
  return {ok:true};
}
export function resolveEquipment(s:BattleState,owner:string,a:EquipmentAction,emit:(event:Omit<DomainEvent,'turn'|'sequence'>)=>void){
  if(a.type==='buy-equipment'){
    const d=equipmentDefinition(a.templateId)!;s.resources[owner]!-=d.price;
    (s.equipment??=[]).push({id:`item-${s.version}-${owner}`,templateId:d.id,owner});
    emit({type:'equipment',agentId:owner,message:`购入 ${d.name}，花费 ${d.price}`});return;
  }
  const item=a.type==='equip-equipment'?s.equipment!.find(i=>i.id===a.itemId)!:undefined;
  const slot=item?equipmentDefinition(item.templateId)!.slot:(a as Extract<EquipmentAction,{type:'unequip-equipment'}>).slot;
  for(const old of s.equipment??[])if(old.owner===owner&&old.bearerId===a.characterId&&equipmentDefinition(old.templateId)?.slot===slot)delete old.bearerId;
  if(item)item.bearerId=a.characterId;
  emit({type:'equipment',agentId:owner,message:`${s.characters!.find(c=>c.id===a.characterId)!.name} ${item?`装备 ${equipmentDefinition(item.templateId)!.name}`:'卸下装备，归还府库'}`});
}
export function transferCapturedEquipment(s:BattleState,id:string,captor:string){
  for(const item of s.equipment??[])if(item.bearerId===id){item.owner=captor;delete item.bearerId;}
}
export function reconcileEquipment(s:BattleState){
  for(const item of s.equipment??[])if(item.bearerId&&!s.characters?.some(c=>c.id===item.bearerId&&c.owner===item.owner&&!c.capturedBy))delete item.bearerId;
}
export function equipmentInitiative(s:BattleState,owner:string):EquipmentAction|undefined{
  if(s.turn===0||s.turn%11!==0||!s.characters)return;
  const people=s.characters.filter(c=>c.owner===owner&&!c.capturedBy&&!isMinor(c)&&!s.armies?.some(a=>a.commanderId===c.id&&a.troops>0));
  for(const c of people)for(const item of s.equipment??[])if(item.owner===owner&&!item.bearerId){
    const slot=equipmentDefinition(item.templateId)?.slot;
    if(slot&&!s.equipment!.some(i=>i.bearerId===c.id&&equipmentDefinition(i.templateId)?.slot===slot))return {type:'equip-equipment',characterId:c.id,itemId:item.id};
  }
  if((s.resources[owner]??0)<150||!people.length)return;
  const templateId=people.some(c=>c.governorCityId!==null)?'governance-scroll':'war-horse';
  if(s.equipment?.some(i=>i.owner===owner&&i.templateId===templateId))return;
  const action={type:'buy-equipment' as const,templateId};return validateEquipment(s,owner,action).ok?action:undefined;
}
