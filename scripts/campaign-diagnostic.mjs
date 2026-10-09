// Read-only headless diagnostic: run after pnpm build; never writes saves/checkpoints.
import {generateBattle} from '../apps/api/dist/domain/generate.js';
import {resolveTurn} from '../apps/api/dist/domain/resolveTurn.js';
import {chooseLearned,candidates,features,value} from '../apps/api/dist/agents/learning.js';
import {loadPolicy} from '../apps/api/dist/agents/training.js';
import {atWar,relationBetween} from '../apps/api/dist/domain/diplomacy.js';
import {writeFileSync} from 'node:fs';
import {fiscalEstimate} from '../apps/api/dist/domain/economy.js';
import {characterBudget} from '../apps/api/dist/domain/characters.js';

const seed=process.argv[2]??'diagnostic-192',horizon=Number(process.argv[3]??500);
if(!Number.isInteger(horizon)||horizon<1||horizon>5000)throw new Error('Diagnostic horizon must be 1–5000 turns');
const policy=await loadPolicy();if(!policy)throw new Error('No active policy');
let state=generateBattle(seed,7,5,16,0);delete state.map;
const tally={};
const events={},lastConquest=new Map(),combat={captures:0,recapturedWithin10Turns:0};
const holdSamples=[],sampledHolds=new Set();
while(state.turn<horizon&&state.status==='active'){
  const orders=state.agents.filter(a=>a.active).map(a=>{
    const action=chooseLearned(state,a,policy);
    const key=action.type+(action.building?`:${action.building}`:action.type==='diplomacy'?`:${action.treaty}`:'');
    tally[key]=(tally[key]??0)+1;
    const sampleKey=`${a.id}-${Math.floor(state.turn/100)}`;
    if(action.type==='hold'&&!sampledHolds.has(sampleKey)){
      sampledHolds.add(sampleKey);
      const options=candidates(state,a);
      holdSamples.push({turn:state.turn,faction:a.name,money:state.resources[a.id],
        counts:options.reduce((counts,option)=>{counts[option.type]=(counts[option.type]??0)+1;return counts;},{}),
        best:options.map(option=>({action:option,score:value(policy,features(state,a,option))})).sort((a,b)=>b.score-a.score).slice(0,4)});
    }
    return {agentId:a.id,action};
  });
  const result=resolveTurn(state,orders,state.version);
  state=result.state;
  for(const event of result.events){
    events[event.type]=(events[event.type]??0)+1;
    if(event.type==='capture'){
      combat.captures++;
      const previous=lastConquest.get(event.cityId);
      if(previous&&previous.owner!==event.agentId&&state.turn-previous.turn<=10)combat.recapturedWithin10Turns++;
      lastConquest.set(event.cityId,{owner:event.agentId,turn:state.turn});
    }
  }
  if(state.turn%100===0)console.log(JSON.stringify({progress:state.turn,horizon,
    survivors:state.agents.filter(a=>a.active).length,
    largestRealm:Math.max(...state.agents.map(a=>state.cities.filter(c=>c.owner===a.id).length))}));
}
// Optional diagnostic-only checkpoint enables inspecting or continuing this
// exact end state, without touching application saves or the active policy.
if(process.argv[4])writeFileSync(process.argv[4],JSON.stringify({seed,policy,state}),{flag:'wx'});
console.log(JSON.stringify({seed,checkpointEpisodes:policy.episodes,turn:state.turn,status:state.status,winner:state.winner,tally,events,combat,holdSamples,
  factions:state.agents.map(a=>{
    const cities=state.cities.filter(c=>c.owner===a.id);
    const neighbours=[...new Set(cities.flatMap(c=>c.adjacent.map(id=>state.cities[id]?.owner)).filter(id=>id&&id!==a.id))];
    return {name:a.name,active:a.active,money:state.resources[a.id],counties:cities.length,
      economy:fiscalEstimate(cities,0,state.armies.filter(x=>x.owner===a.id)),personnel:characterBudget(state,a.id),
      neighbourRelations:neighbours.map(id=>({name:state.agents.find(b=>b.id===id)?.name,...relationBetween(state,a.id,id)})),
      troops:cities.reduce((n,c)=>n+c.troops,0),maxGarrison:Math.max(0,...cities.map(c=>c.troops)),
      frontiers:cities.filter(c=>c.adjacent.some(id=>{const n=state.cities[id];return n&&n.terrain!=='blocked'&&n.owner!==a.id&&(!n.owner||atWar(state,a.id,n.owner));})).length,
      armies:state.armies.filter(x=>x.owner===a.id).length,
      haltedTroops:state.armies.filter(x=>x.owner===a.id&&x.halted).reduce((n,x)=>n+x.troops,0)};
  })},null,2));
