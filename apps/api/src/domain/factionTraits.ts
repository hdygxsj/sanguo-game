import type {BattleState,CityState,UnitType} from './types.js';
import {troopUpkeep,composition,type TroopBody,UNIT_RULES} from './troops.js';

export type PrestigeSource='economy'|'territory'|'military'|'construction';
type Trait={name:string;description:string;farm?:number;mine?:number;horse?:number;city?:number;trade?:number;rebate?:number;unit?:UnitType;prestige?:PrestigeSource;kingdom:string};
// Original campaign modifiers inspired by asymmetric warlord identities, not TW data.
export const FACTION_TRAITS:Record<string,Trait>={
  曹操:{name:'屯田治军',description:'每处农庄额外收入 +2；全军军饷返还 10%。',farm:2,rebate:.1,kingdom:'魏'},
  刘备:{name:'仁德归心',description:'枪兵军饷返还 20%；有领地名望收益时额外 +1。',rebate:.2,unit:'spear',prestige:'territory',kingdom:'蜀'},
  孙坚:{name:'江东武烈',description:'刀盾兵军饷返还 20%；有军力名望收益时额外 +1。',rebate:.2,unit:'sword',prestige:'military',kingdom:'吴'},
  袁绍:{name:'四世三公',description:'每座城池额外收入 +1；有领地名望收益时额外 +1。',city:1,prestige:'territory',kingdom:'燕'},
  袁术:{name:'仲氏雄心',description:'每处矿场额外收入 +2；有经济名望收益时额外 +1。',mine:2,prestige:'economy',kingdom:'仲'},
  董卓:{name:'西凉威权',description:'全军军饷返还 15%；有军力名望收益时额外 +1。',rebate:.15,prestige:'military',kingdom:'凉'},
  刘表:{name:'荆襄文治',description:'每座城池额外收入 +1；有建设名望收益时额外 +1。',city:1,prestige:'construction',kingdom:'楚'},
  刘焉:{name:'益州天府',description:'每处农庄额外收入 +3；有建设名望收益时额外 +1。',farm:3,prestige:'construction',kingdom:'益'},
  马腾:{name:'西凉牧马',description:'每处马场额外收入 +2；骑兵军饷返还 25%。',horse:2,rebate:.25,unit:'cavalry',kingdom:'秦'},
  公孙瓒:{name:'白马义从',description:'骑兵军饷返还 20%；有军力名望收益时额外 +1。',rebate:.2,unit:'cavalry',prestige:'military',kingdom:'辽'},
  孔融:{name:'北海通商',description:'每个通商伙伴额外收入 +3；有经济名望收益时额外 +1。',trade:3,prestige:'economy',kingdom:'鲁'},
  张燕:{name:'黑山轻军',description:'全军军饷返还 20%；每处矿场额外收入 +1。',rebate:.2,mine:1,kingdom:'赵'},
  陶谦:{name:'徐州安民',description:'每处农庄额外收入 +2；枪兵军饷返还 15%。',farm:2,rebate:.15,unit:'spear',kingdom:'徐'},
  刘繇:{name:'扬州经略',description:'每个通商伙伴额外收入 +2；弓兵军饷返还 20%。',trade:2,rebate:.2,unit:'archer',kingdom:'越'},
  张鲁:{name:'五斗济民',description:'每处农庄额外收入 +2；有经济名望收益时额外 +1。',farm:2,prestige:'economy',kingdom:'汉宁'},
  士燮:{name:'交州商路',description:'每个通商伙伴额外收入 +3；每处矿场额外收入 +2。',trade:3,mine:2,kingdom:'交'},
};
const neutral:Trait={name:'自立诸侯',description:'无额外势力加成。',kingdom:'汉'};
export const factionTrait=(name:string):Trait=>FACTION_TRAITS[name]??neutral;
export function factionBonus(state:BattleState,owner:string,cities?:CityState[],armies?:TroopBody[]){
  const trait=factionTrait(state.agents.find(a=>a.id===owner)?.name??'');
  const owned=cities??state.cities.filter(c=>c.owner===owner),bodies=[...owned,...(armies??(state.armies??[]).filter(a=>a.owner===owner))];
  const estates=owned.reduce((sum,c)=>sum+(trait[c.siteKind??'city']??0),0);
  const partners=owned.length&&trait.trade?state.agents.filter(a=>a.active&&a.id!==owner&&state.cities.some(c=>c.owner===a.id)&&(()=>{const r=state.diplomacy?.[[owner,a.id].sort().join(':')];return r?.trade&&r.status!=='war';})()).length:0;
  const trade=partners*(trait.trade??0);
  const eligible=bodies.reduce((sum,b)=>sum+(trait.unit?composition(b)[trait.unit]*UNIT_RULES[trait.unit].upkeep:troopUpkeep(b)),0);
  const wages=Math.floor(eligible*(trait.rebate??0)+1e-9);
  return {estates,trade,wages,total:estates+trade+wages};
}
