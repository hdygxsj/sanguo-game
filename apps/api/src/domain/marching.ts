import {formatTroops} from './troopScale.js';
import {collapseKingdoms} from './kingdom.js';
import type { ArmyState, BattleState, CityState, DomainEvent } from './types.js';
import {atWar,relationBetween} from './diplomacy.js';
import {captureCommander,commandMultiplier} from './commanders.js';
import {marchEquipmentMultiplier} from './equipment.js';
import {detachTroops,mergeTroops,setTroops,troopMarchMultiplier,troopMultiplier} from './troops.js';
import {terrainTravelCost} from './campaignTerrain.js';

type Emit = (event: Omit<DomainEvent, 'sequence' | 'turn'>) => void;
const EPS = 1e-8;
export const MARCH_SPEED = .7;
export const roadLength = (a: CityState, b: CityState) => Math.max(.1, Math.hypot(a.x-b.x,a.z-b.z));
export function weatherModifier(weather: string) {
  return weather === 'blizzard' ? .72 : weather === 'snow' || weather === 'rain' ? .86 : weather === 'fog' ? .92 : 1;
}

export function roadRoute(state: BattleState, from: number, to: number, owner?:string): number[] | null {
  // Reinforcing one's own county is not an instruction to invade a shortcut.
  // Use the same weather-weighted planner within the friendly component first.
  if(owner&&state.cities[from]?.owner===owner&&state.cities[to]?.owner===owner){
    const friendly=findRoadRoute(state,from,to,owner,true);
    if(friendly)return friendly;
  }
  return findRoadRoute(state,from,to,owner);
}

function findRoadRoute(state: BattleState, from: number, to: number, owner?:string, friendlyOnly=false): number[] | null {
  if (from === to || !state.cities[from] || !state.cities[to] || state.cities[to]!.terrain === 'blocked') return null;
  const distances = new Map([[from,0]]), previous = new Map<number,number>(), visited = new Set<number>();
  while (true) {
    let current = -1, best = Infinity;
    for (const [id, distance] of distances) if (!visited.has(id) && distance < best) {current=id;best=distance;}
    if (current < 0) return null;
    if (current === to) {
      const route=[to]; while(route[0] !== from) route.unshift(previous.get(route[0]!)!); return route;
    }
    visited.add(current);
    const source=state.cities[current]!;
    for (const id of source.adjacent) {
      const target=state.cities[id]; if(!target || target.terrain==='blocked' || visited.has(id)) continue;
      if(friendlyOnly&&target.owner!==owner)continue;
      if(owner&&target.owner&&target.owner!==owner&&relationBetween(state,owner,target.owner).status==='peace')continue;
      const distance=best+terrainTravelCost(state,source.id,target.id)/weatherModifier(target.weather);
      if(distance < (distances.get(id) ?? Infinity)) {distances.set(id,distance);previous.set(id,current);}
    }
  }
}

export function dispatchArmy(state: BattleState, owner: string, from: number, to: number, troops: number, emit: Emit,commanderId?:string) {
  const route=roadRoute(state,from,to,owner);
  if(!route) throw new Error('NO_ROAD_ROUTE');
  const units=detachTroops(state.cities[from]!,troops);
  const army: ArmyState={id:`army-${state.version}-${owner}`,owner,troops,route,leg:0,progress:0,speed:MARCH_SPEED};
  if(commanderId)army.commanderId=commanderId;
  army.units=units;
  (state.armies ??= []).push(army);
  emit({type:'march',agentId:owner,armyId:army.id,fromCityId:from,toCityId:to,amount:troops,message:`${state.agents.find(a=>a.id===owner)?.name} 派出 ${formatTroops(troops)} 人，沿 ${route.length-1} 段道路前往 ${state.cities[to]!.name}`});
}

function edge(state: BattleState, army: ArmyState) {
  const from=state.cities[army.route[army.leg]!]!, to=state.cities[army.route[army.leg+1]!]!;
  const rate=army.halted||from.id===to.id?0:army.speed*troopMarchMultiplier(army)*marchEquipmentMultiplier(state,army)*weatherModifier(to.weather)/terrainTravelCost(state,from.id,to.id);
  const end=army.leg===army.route.length-2?army.stopProgress??1:1;
  return {from:from.id,to:to.id,rate,end,arrival:rate>0?Math.max(0,(end-army.progress)/rate):Infinity};
}

export function remainingMarchTurns(state: BattleState, army: ArmyState) {
  if(army.halted&&(army.stance==='camp'||army.stance==='ambush'))return 0;
  let duration=0;
  for(let leg=army.leg;leg<army.route.length-1;leg++) {
    const from=state.cities[army.route[leg]!]!,to=state.cities[army.route[leg+1]!]!;
    if(from.id===to.id)continue;
    const end=leg===army.route.length-2?army.stopProgress??1:1;
    duration+=terrainTravelCost(state,from.id,to.id)*(end-(leg===army.leg?army.progress:0))/(army.speed*troopMarchMultiplier(army)*marchEquipmentMultiplier(state,army)*weatherModifier(to.weather));
  }
  return Math.ceil(Math.max(0,duration-EPS));
}

function fieldBattle(state:BattleState,a: ArmyState, b: ArmyState, emit: Emit) {
  const first=a.troops, second=b.troops;
  const ambushA=a.stance==='ambush',ambushB=b.stance==='ambush';
  const ma=commandMultiplier(state,a)*troopMultiplier(a,b)*(ambushA?1.2:1),mb=commandMultiplier(state,b)*troopMultiplier(b,a)*(ambushB?1.2:1);
  if(ambushA||ambushB)emit({type:'field-battle',armyId:ambushA?a.id:b.id,message:'伏击发动：伏兵获得本次野战 20% 战力优势，交战后转为驻扎。'});
  if(ambushA)a.stance='camp';if(ambushB)b.stance='camp';
  let remainingA=Math.max(0,Math.round(first-second*mb/ma)),remainingB=Math.max(0,Math.round(second-first*ma/mb));
  // A strict power advantage leaves at least one survivor despite rounding.
  if(first*ma>second*mb)remainingA=Math.max(1,remainingA);
  if(second*mb>first*ma)remainingB=Math.max(1,remainingB);
  setTroops(a,remainingA);setTroops(b,remainingB);
  if(!a.troops)captureCommander(state,a,b.troops?b.owner:null,emit);
  if(!b.troops)captureCommander(state,b,a.troops?a.owner:null,emit);
  emit({type:'field-battle',armyId:a.id,agentId:a.owner,amount:first+second-a.troops-b.troops,
    message:`途中遭遇：${a.id}（${formatTroops(first)} 人）与 ${b.id}（${formatTroops(second)} 人）野战，余兵 ${formatTroops(a.troops)} / ${formatTroops(b.troops)} 人；不计城防加成`});
}

function arrive(state: BattleState, army: ArmyState, emit: Emit) {
  const target=state.cities[army.route[army.leg+1]!]!;
  if(target.owner&&target.owner!==army.owner&&!atWar(state,army.owner,target.owner)) {
    if(relationBetween(state,army.owner,target.owner).status==='alliance'&&army.leg+1<army.route.length-1){army.leg++;army.progress=0;return;}
    army.halted=true;
    emit({type:'diplomacy',agentId:army.owner,armyId:army.id,cityId:target.id,message:`${army.id} 在 ${target.name} 边界停驻：非交战领土，不发动进攻`});return;
  }
  if(target.owner !== army.owner) {
    const multiplier=commandMultiplier(state,army)*troopMultiplier(army,target,true),defenderMultiplier=target.defenseMultiplier*troopMultiplier(target,army);
    const effectiveMultiplier=weatherModifier(target.weather)*multiplier;
    const attack=army.troops*effectiveMultiplier, defense=target.troops*defenderMultiplier;
    emit({type:'attack',agentId:army.owner,armyId:army.id,toCityId:target.id,amount:army.troops,message:`${army.id} 抵达 ${target.name}，自动攻城`});
    if(attack <= defense) {setTroops(target,Math.max(1,Math.round(target.troops-attack/defenderMultiplier)));setTroops(army,0);captureCommander(state,army,attack<defense?target.owner:null,emit);return;}
    // Convert remaining combat power back with the same efficiency used above.
    // Weather weakens combat; it does not kill troops in an undefended county.
    setTroops(army,Math.max(1,Math.round((attack-defense)/effectiveMultiplier)));target.owner=army.owner;setTroops(target,0);
    collapseKingdoms(state,emit);
    emit({type:'capture',agentId:army.owner,armyId:army.id,cityId:target.id,toCityId:target.id,message:`${state.agents.find(a=>a.id===army.owner)?.name} 占领 ${target.name}`});
    if(army.leg+1 < army.route.length-1) {const units=detachTroops(army,1);mergeTroops(target,{troops:1,units});}
  }
  if(army.leg+1 === army.route.length-1) {
    if(army.persistent){
      army.route=[target.id,target.id];army.leg=0;army.progress=0;army.halted=true;army.stance='camp';delete army.stopProgress;
      emit({type:'arrival',agentId:army.owner,armyId:army.id,cityId:target.id,amount:army.troops,message:`${army.name??army.id} 抵达 ${target.name} 并独立驻扎，守军与兵团分开编制。`});return;
    }
    mergeTroops(target,army);
    emit({type:'arrival',agentId:army.owner,armyId:army.id,cityId:target.id,amount:army.troops,message:`${army.id} 抵达 ${target.name}，${formatTroops(army.troops)} 人入驻`});
    setTroops(army,0);
  } else {army.leg++;army.progress=0;}
}

/** Shared time axis: recompute the next contact after every combat/arrival.
 * This prevents fast armies tunnelling through enemies or dead armies arriving. */
export function advanceArmies(state: BattleState, emit: Emit) {
  state.armies ??= [];
  for(const army of state.armies)if(army.halted){
    if(army.stance==='camp'||army.stance==='ambush')continue;
    if(army.blockedReason==='terrain')continue;
    const to=state.cities[army.route[army.leg+1]!]!;
    if(!to.owner||to.owner===army.owner||atWar(state,army.owner,to.owner)||(relationBetween(state,army.owner,to.owner).status==='alliance'&&army.leg+1<army.route.length-1))army.halted=false;
  }
  let remaining=1;
  while(state.armies?.length) {
    const armies: ArmyState[]=state.armies, edges=armies.map(a=>edge(state,a));
    let duration=Math.min(Math.max(0,remaining),...edges.map(e=>e.arrival));
    let encounter: [ArmyState,ArmyState] | null=null;
    for(let i=0;i<armies.length;i++) for(let j=i+1;j<armies.length;j++) {
      const a=armies[i]!,b=armies[j]!,ea=edges[i]!,eb=edges[j]!;
      if(!atWar(state,a.owner,b.owner)) continue;
      let contact=Infinity;
      if(Math.min(ea.from,ea.to)===Math.min(eb.from,eb.to) && Math.max(ea.from,ea.to)===Math.max(eb.from,eb.to)) {
        const pa=ea.from<ea.to?a.progress:1-a.progress, pb=eb.from<eb.to?b.progress:1-b.progress;
        const va=ea.from<ea.to?ea.rate:-ea.rate, vb=eb.from<eb.to?eb.rate:-eb.rate;
        if(Math.abs(pa-pb)<EPS) contact=0;
        else if(Math.abs(va-vb)>EPS) contact=(pb-pa)/(va-vb);
      } else if(ea.to===eb.to && ea.end===1&&eb.end===1&&Math.abs(ea.arrival-eb.arrival)<EPS) contact=ea.arrival;
      const nodeA=a.progress<EPS?ea.from:a.progress>=1-EPS?ea.to:null;
      const nodeB=b.progress<EPS?eb.from:b.progress>=1-EPS?eb.to:null;
      if(nodeA!==null&&nodeA===nodeB)contact=0;
      else if(a.halted&&nodeA===eb.to&&eb.end===1)contact=Math.min(contact,eb.arrival);
      else if(b.halted&&nodeB===ea.to&&ea.end===1)contact=Math.min(contact,ea.arrival);
      if(contact>=-EPS && contact<=duration+EPS) {duration=Math.max(0,Math.min(duration,contact));encounter=[a,b];}
    }
    armies.forEach((a,i)=>{a.progress=Math.min(1,a.progress+edges[i]!.rate*duration);});
    remaining-=duration;
    if(encounter) {
      fieldBattle(state,...encounter,emit);
      state.armies=state.armies.filter(a=>a.troops>0);
      // Arrivals are processed next, after all contacts at this timestamp.
      continue;
    }
    for(const army of armies) if(!army.halted){
      if(army.stopProgress!==undefined&&army.leg===army.route.length-2&&army.progress>=army.stopProgress-EPS){army.progress=army.stopProgress;army.halted=true;army.stance='camp';delete army.stopProgress;emit({type:'arrival',agentId:army.owner,armyId:army.id,message:`${army.name??army.id} 已抵达野外驻扎点，可原地设伏或继续行军。`});}
      else if(army.progress>=1-EPS)arrive(state,army,emit);
    }
    state.armies=state.armies.filter(a=>a.troops>0);
    if(remaining<=EPS) break;
  }
  for(const army of state.armies ?? []){
    const turns=remainingMarchTurns(state,army);army.remainingTurns=Number.isFinite(turns)?turns:undefined;
    if(!Number.isFinite(turns)&&!army.halted){army.halted=true;army.blockedReason='terrain';emit({type:'march',agentId:army.owner,armyId:army.id,message:'行军暂停：旧路线包含不可通行的陡坡，部队原地待命。'});}
  }
}
