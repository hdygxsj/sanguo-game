// Bounded in-memory learning audit. No checkpoints or game saves are written.
import {generateBattle} from '../apps/api/dist/domain/generate.js';
import {resolveTurn} from '../apps/api/dist/domain/resolveTurn.js';
import {chooseAction} from '../apps/api/dist/agents/strategies.js';
import {chooseLearned,learn,upgradePolicy,utility} from '../apps/api/dist/agents/learning.js';
import {loadPolicy} from '../apps/api/dist/agents/training.js';
import {endgameScenario} from '../apps/api/dist/agents/curriculum.js';
const episodes=Number(process.argv[2]??16),horizon=Number(process.argv[3]??300),seed=208;
if(!Number.isInteger(episodes)||episodes<1||episodes>64||!Number.isInteger(horizon)||horizon<1||horizon>1000)throw new Error('Diagnostic budget: 1–64 episodes, 1–1000 turns');
const existing=await loadPolicy();if(!existing)throw new Error('No incumbent');
const policy=upgradePolicy(existing),opponent=structuredClone(policy),rows=[];
let randomSeed=seed;const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
for(let episode=0;episode<episodes;episode++){
  const start=[...policy.weights],learner=(policy.episodes+episode)%16,local=episode%3===0;
  let state=generateBattle(`training-${seed}-${policy.episodes+episode}`,7,5,16,0);delete state.map;
  if(local)state=endgameScenario(state,learner,18,(Math.floor((policy.episodes+episode)/16)+learner)%2===1);
  const pending=[],actionsByType={},rewardByType={};
  while(state.status==='active'&&state.turn<horizon&&state.agents[learner].active){
    const agent=state.agents[learner],epsilon=.35*(1-episode/episodes)+.05;
    const orders=state.agents.filter(a=>a.active).map(a=>({agentId:a.id,action:a.id===agent.id?chooseLearned(state,a,policy,epsilon,random):episode%2===0?chooseAction(state,a,random()):chooseLearned(state,a,opponent,.05,random)}));
    const action=orders.find(a=>a.agentId===agent.id).action;
    const after=resolveTurn(state,orders,state.version).state;
    actionsByType[action.type]=(actionsByType[action.type]??0)+1;
    rewardByType[action.type]=(rewardByType[action.type]??0)+utility(after,agent.id)-utility(state,agent.id);
    learn(policy,state,after,agent,action,pending,after.turn>=horizon);state=after;
  }
  const row={episode:episode+1,local,seat:learner,turns:state.turn,status:state.status,winner:state.winner,
    actionsByType,rewardByType,delta:policy.weights.map((v,i)=>v-start[i])};
  rows.push(row);console.error(JSON.stringify({episode:row.episode,local,turns:row.turns,recruits:actionsByType.recruit??0,recruitWeightDelta:row.delta[2],costWeightDelta:row.delta[16]}));
}
console.log(JSON.stringify({seed,episodes,horizon,environment:'current runtime; diagnostic only',rows,finalWeights:policy.weights},null,2));
