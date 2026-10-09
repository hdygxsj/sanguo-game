// Read-only, same-state comparison; never trains, promotes or writes a save.
import {readFileSync} from 'node:fs';
import {generateBattle} from '../apps/api/dist/domain/generate.js';
import {resolveTurn} from '../apps/api/dist/domain/resolveTurn.js';
import {chooseLearned,candidates,features,value} from '../apps/api/dist/agents/learning.js';
const archive=process.argv[2],horizon=Number(process.argv[3]??120);
if(!archive||!Number.isInteger(horizon)||horizon<1||horizon>1000)throw new Error('Usage: node scripts/compare-policy-decisions.mjs archive.json [1–1000 turns]');
const candidate=JSON.parse(readFileSync(archive)).policy;
const incumbent=JSON.parse(readFileSync(new URL('../data/learned-policy.json',import.meta.url)));
let state=generateBattle('evaluation-world-0',7,5,16,0);delete state.map;
const tally={incumbent:{},candidate:{}},switches={},samples=[];
const key=a=>a.type+(a.building?`:${a.building}`:'');
while(state.status==='active'&&state.turn<horizon){
  const orders=state.agents.filter(a=>a.active).map(agent=>{
    const old=chooseLearned(state,agent,incumbent),next=chooseLearned(state,agent,candidate);
    tally.incumbent[key(old)]=(tally.incumbent[key(old)]??0)+1;
    tally.candidate[key(next)]=(tally.candidate[key(next)]??0)+1;
    if(key(old)!==key(next)){
      const transition=`${key(old)} -> ${key(next)}`;switches[transition]=(switches[transition]??0)+1;
      if(samples.length<12&&['attack','move','recruit'].includes(old.type)){
        const options=candidates(state,agent),scores=options.map(a=>({action:a,old:value(incumbent,features(state,agent,a)),candidate:value(candidate,features(state,agent,a))}));
        samples.push({turn:state.turn,faction:agent.name,old,next,oldBest:[...scores].sort((a,b)=>b.old-a.old).slice(0,2),candidateBest:scores.sort((a,b)=>b.candidate-a.candidate).slice(0,2)});
      }
    }
    return {agentId:agent.id,action:old};
  });
  state=resolveTurn(state,orders,state.version).state;
  if(state.turn%30===0)console.error(`same-state comparison ${state.turn}/${horizon}`);
}
console.log(JSON.stringify({archive,horizon:state.turn,environment:'current runtime; incumbent supplies trajectory',tally,switches,samples},null,2));
