import type {BattleState,BuildingType,CityState,DomainEvent,UnitType,ValidationResult} from './types.js';
import {UNIT_RULES} from './troops.js';

export const BUILDING_TYPES:BuildingType[]=['farm','market','barracks'];
export const BUILDINGS={
  farm:{name:'农庄',cost:30,description:'每级税收 +2；田地或粮仓县为 +4，维护 +1'},
  market:{name:'市集',cost:40,description:'每级税收 +4，维护 +2'},
  barracks:{name:'军营',cost:50,description:'每级征募价格降低 10%，每兵向上取整；维护 +1'},
} as const;
export const buildingCost=(city:CityState,type:BuildingType)=>BUILDINGS[type].cost*((city.buildings?.[type]??0)+1);
export function validateConstruction(city:CityState,type:BuildingType,money:number):ValidationResult {
  const fail=(code:string):ValidationResult=>({ok:false,code});
  if(!BUILDING_TYPES.includes(type))return fail('INVALID_BUILDING');
  if(city.construction)return fail('CONSTRUCTION_BUSY');
  const level=city.buildings?.[type]??0;
  if(level>=3)return fail('MAX_BUILDING_LEVEL');
  if(!level&&BUILDING_TYPES.filter(t=>(city.buildings?.[t]??0)>0).length>=Math.min(3,city.level))return fail('BUILDING_SLOTS_FULL');
  if(money<buildingCost(city,type))return fail('INSUFFICIENT_RESOURCES');
  return {ok:true};
}
export function buildingBudget(city:CityState) {
  const {farm=0,market=0,barracks=0}=city.buildings??{};
  return {revenue:farm*(city.terrain==='farmland'||city.resourceTrait==='granary'?4:2)+market*4,maintenance:farm+market*2+barracks};
}
export const recruitmentPrice=(city:CityState|undefined,type:UnitType)=>Math.ceil(UNIT_RULES[type].cost*(1-(city?.buildings?.barracks??0)*.1)-1e-9);
export function settleConstruction(state:BattleState,emit:(e:Omit<DomainEvent,'sequence'|'turn'>)=>void) {
  for(const city of state.cities){
    const job=city.construction;
    if(!job||job.completesTurn>state.turn)continue;
    city.buildings??={};city.buildings[job.building]=job.level;
    delete city.construction;
    emit({type:'develop',cityId:city.id,...(city.owner?{agentId:city.owner}:{}),message:`${city.name} ${BUILDINGS[job.building].name} ${job.level} 级竣工`});
  }
}
