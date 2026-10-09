import type {BattleAction,BattleState,CourtOffice,DomainEvent,ValidationResult} from './types.js';
import {isMinor} from './lifecycle.js';
import {effectiveAttributes} from './equipment.js';

export const COURT_OFFICES={
  chancellor:{name:'丞相',cost:80,salary:3},
  marshal:{name:'大将军',cost:60,salary:3},
  treasurer:{name:'太府卿',cost:40,salary:2},
} as const;
type CourtAction=Extract<BattleAction,{type:'appoint-court'|'dismiss-court'}>;
export const isCourtAction=(a:BattleAction):a is CourtAction=>a.type==='appoint-court'||a.type==='dismiss-court';
export function courtHolder(s:BattleState,owner:string,office:CourtOffice){
  const id=s.court?.[owner]?.[office];
  return s.characters?.find(p=>p.id===id&&p.owner===owner&&!p.capturedBy&&!isMinor(p)&&!p.ruler&&p.governorCityId===null);
}
export function courtOffice(s:BattleState,id:string):CourtOffice|undefined{
  const person=s.characters?.find(p=>p.id===id);if(!person?.owner)return;
  return (Object.keys(COURT_OFFICES) as CourtOffice[]).find(o=>courtHolder(s,person.owner!,o)?.id===id);
}
export function courtBudget(s:BattleState,owner:string){
  let salary=0,revenue=0;
  for(const office of Object.keys(COURT_OFFICES) as CourtOffice[]){
    const p=courtHolder(s,owner,office);if(!p)continue;
    salary+=COURT_OFFICES[office].salary;
    const ability=effectiveAttributes(s,p).politics*p.loyalty;
    if(office==='chancellor')revenue+=Math.min(8,Math.floor(ability/1000));
    if(office==='treasurer')revenue+=Math.min(5,Math.floor(ability/1500));
  }
  return {salary,revenue};
}
export function marshalBonus(s:BattleState,owner:string){
  const p=courtHolder(s,owner,'marshal');
  return p?Math.min(.06,effectiveAttributes(s,p).command*p.loyalty/125000):0;
}
export function validateCourt(s:BattleState,owner:string,a:CourtAction):ValidationResult{
  const p=s.characters?.find(p=>p.id===a.characterId);
  if(!p||p.owner!==owner)return {ok:false,code:'CHARACTER_NOT_OWNED'};
  if(p.capturedBy)return {ok:false,code:'CHARACTER_CAPTURED'};
  if(isMinor(p))return {ok:false,code:'CHARACTER_UNDERAGE'};
  if(p.ruler)return {ok:false,code:'RULER_CANNOT_SERVE'};
  if(s.armies?.some(army=>army.commanderId===p.id&&army.troops>0))return {ok:false,code:'CHARACTER_COMMANDING'};
  if(a.type==='dismiss-court')return courtOffice(s,p.id)?{ok:true}:{ok:false,code:'NOT_COURT_OFFICER'};
  if(p.governorCityId!==null||courtOffice(s,p.id))return {ok:false,code:'OFFICE_CONFLICT'};
  if(courtHolder(s,owner,a.office))return {ok:false,code:'COURT_OCCUPIED'};
  if(p.loyalty<50)return {ok:false,code:'LOYALTY_TOO_LOW'};
  if((s.resources[owner]??0)<COURT_OFFICES[a.office].cost)return {ok:false,code:'INSUFFICIENT_RESOURCES'};
  return {ok:true};
}
export function resolveCourt(s:BattleState,owner:string,a:CourtAction,emit:(event:Omit<DomainEvent,'turn'|'sequence'>)=>void){
  const p=s.characters!.find(p=>p.id===a.characterId)!;
  if(a.type==='appoint-court'){
    s.court??={};s.court[owner]??={};s.court[owner]![a.office]=p.id;
    const job=COURT_OFFICES[a.office];s.resources[owner]!-=job.cost;p.loyalty=Math.min(100,p.loyalty+8);
    emit({type:'personnel',agentId:owner,amount:job.cost,message:`任命 ${p.name} 为 ${job.name}，支出 ${job.cost}，额外俸禄 ${job.salary}/回合`});
  }else{
    const office=courtOffice(s,p.id)!;delete s.court![owner]![office];p.loyalty=Math.max(0,p.loyalty-10);
    emit({type:'personnel',agentId:owner,message:`${p.name} 卸任 ${COURT_OFFICES[office].name}，忠诚 ${p.loyalty}`});
  }
}
export function reconcileCourt(s:BattleState){
  for(const [owner,offices] of Object.entries(s.court??{}))for(const office of Object.keys(offices) as CourtOffice[])
    if(!courtHolder(s,owner,office))delete offices[office];
}
