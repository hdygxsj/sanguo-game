import type {UnitType} from './types.js';
export type TroopBody={troops:number;units?:Partial<Record<UnitType,number>>};
export const UNIT_TYPES:UnitType[]=['spear','sword','archer','cavalry'];
export const UNIT_RULES={spear:{name:'枪兵',cost:3,upkeep:.15},sword:{name:'刀盾兵',cost:4,upkeep:.2},archer:{name:'弓兵',cost:4,upkeep:.2},cavalry:{name:'骑兵',cost:7,upkeep:.4}} as const;
const empty=():Record<UnitType,number>=>({spear:0,sword:0,archer:0,cavalry:0});
function allocate(weights:Record<UnitType,number>,total:number){
  const sum=UNIT_TYPES.reduce((s,t)=>s+weights[t],0),result=empty();
  if(!sum){result.spear=total;return result;}
  const remainders=UNIT_TYPES.map(t=>{const exact=weights[t]*total/sum;result[t]=Math.floor(exact);return {t,remainder:exact-result[t]};}).sort((a,b)=>b.remainder-a.remainder);
  let left=total-UNIT_TYPES.reduce((s,t)=>s+result[t],0);
  for(const {t} of remainders){if(left--<=0)break;result[t]++;}
  return result;
}
export function composition(body:TroopBody){
  const weights=empty();for(const t of UNIT_TYPES)weights[t]=Math.max(0,Math.floor(body.units?.[t]??0));
  return allocate(weights,Math.max(0,Math.floor(body.troops)));
}
export function setTroops(body:TroopBody,total:number){body.units=allocate(composition(body),Math.max(0,Math.floor(total)));body.troops=Math.max(0,Math.floor(total));}
export function detachTroops(body:TroopBody,amount:number){
  const before=composition(body),count=Math.max(0,Math.min(body.troops,Math.floor(amount))),taken=allocate(before,count);
  body.units=empty();for(const t of UNIT_TYPES)body.units[t]=before[t]-taken[t];body.troops-=count;return taken;
}
export function mergeTroops(target:TroopBody,source:TroopBody){
  const a=composition(target),b=composition(source);for(const t of UNIT_TYPES)a[t]+=b[t];target.units=a;target.troops+=source.troops;
}
export const troopUpkeep=(body:TroopBody)=>{const c=composition(body);return UNIT_TYPES.reduce((sum,t)=>sum+c[t]*UNIT_RULES[t].upkeep,0);};
export const troopMarchMultiplier=(body:TroopBody)=>1+(body.troops?composition(body).cavalry/body.troops*.35:0);
export function troopMultiplier(attacker:TroopBody,defender:TroopBody,siege=false){
  if(!attacker.troops)return 1;
  const a=composition(attacker),b=composition(defender),beats:Record<UnitType,UnitType>={spear:'cavalry',sword:'spear',archer:'sword',cavalry:'archer'};
  let result=0;
  for(const t of UNIT_TYPES){
    let factor=1;
    if(defender.troops)factor=UNIT_TYPES.reduce((sum,u)=>sum+b[u]/defender.troops*(beats[t]===u?1.25:beats[u]===t?.85:1),0);
    if(siege)factor*=t==='cavalry'?.75:t==='archer'?1.08:1;
    result+=a[t]/attacker.troops*factor;
  }
  return result;
}
export function troopSummary(body:TroopBody){const c=composition(body);return UNIT_TYPES.filter(t=>c[t]>0).map(t=>`${UNIT_RULES[t].name} ${formatTroops(c[t])} 人`).join(' · ');}
import {formatTroops} from './troopScale.js';
