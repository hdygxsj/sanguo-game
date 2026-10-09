import type {BattleState} from '../domain/types.js';

/** Training-only connected county theatre. Never used by campaign creation or
 * held-out evaluation; local victories are not full-map unification evidence. */
export function endgameScenario(full:BattleState,seat:number,count=18,disadvantaged=seat%2===1):BattleState{
  const owner=full.agents[seat];
  if(!owner||!Number.isInteger(count)||count<2)throw Error('INVALID_CURRICULUM');
  const start=full.cities.filter(c=>c.owner===owner.id&&c.terrain!=='blocked').sort((a,b)=>b.troops-a.troops)[0];
  if(!start)throw Error('CURRICULUM_START_MISSING');
  const ids=[start.id],seen=new Set(ids);
  for(let i=0;i<ids.length&&ids.length<count;i++)for(const next of full.cities[ids[i]!]!.adjacent){
    if(ids.length>=count)break;
    if(full.cities[next]?.terrain!=='blocked'&&!seen.has(next)){seen.add(next);ids.push(next);}
  }
  if(ids.length<count)throw Error('CURRICULUM_REGION_TOO_SMALL');
  const state=structuredClone(full),opponent=state.agents[(seat+1)%state.agents.length]!;
  const remap=new Map(ids.map((id,i)=>[id,i]));
  state.cities=ids.map((id,i)=>({...structuredClone(full.cities[id]!),id:i,
    adjacent:full.cities[id]!.adjacent.filter(n=>remap.has(n)).map(n=>remap.get(n)!),
    troops:4,units:{spear:4},level:1,defenseMultiplier:1.12,construction:undefined,buildings:undefined}));
  const distances=(root:number)=>{
    const result=new Map([[root,0]]),queue=[root];
    for(let i=0;i<queue.length;i++)for(const next of state.cities[queue[i]!]!.adjacent)if(!result.has(next)){
      result.set(next,result.get(queue[i]!)!+1);queue.push(next);
    }
    return result;
  };
  const left=distances(0),right=distances(count-1);
  const leftOwner=disadvantaged?opponent.id:owner.id,rightOwner=disadvantaged?owner.id:opponent.id;
  for(const c of state.cities)c.owner=left.get(c.id)!<=right.get(c.id)!?leftOwner:rightOwner;
  // Alternate both the geographic side and strength, not only the troop count:
  // the central side usually owns more counties and a larger tax base.
  state.cities[0]!.troops=60;state.cities[count-1]!.troops=24;
  for(const c of state.cities)c.units={spear:c.troops};
  for(const a of state.agents)a.active=a.id===owner.id||a.id===opponent.id;
  state.characters=state.characters?.filter(c=>c.owner===owner.id||c.owner===opponent.id).map(c=>({...c,governorCityId:null}));
  state.resources=Object.fromEntries(state.agents.map(a=>[a.id,a.active?120:0]));
  state.armies=[];state.diplomacy={};state.diplomaticOffers=[];state.turn=0;state.version=0;
  state.status='active';state.winner=null;state.maxTurns=0;
  delete state.map;delete state.playerAgentId;
  return state;
}
