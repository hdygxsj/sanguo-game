import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateBattle } from '../domain/generate.js';
import { resolveTurn } from '../domain/resolveTurn.js';
import type { LearnedPolicy } from '../domain/types.js';
import { chooseAction } from './strategies.js';
import { chooseLearned, learn, newPolicy, FEATURE_COUNT, upgradePolicy } from './learning.js';
import {RETURN_DISCOUNT,RETURN_STEPS,type Transition} from './returns.js';
import {promotionDecision} from './promotion.js';
import {trainingSeed} from './trainingSeed.js';
import {endgameScenario} from './curriculum.js';
import {evaluationSchedule} from './evaluationSchedule.js';
import {TrainingChannel} from './trainingChannel.js';

const MODEL_PATH = fileURLToPath(new URL('../../../../data/learned-policy.json', import.meta.url));
export async function loadPolicy(): Promise<LearnedPolicy | undefined> {
  try {
    const policy = JSON.parse(await readFile(MODEL_PATH,'utf8')) as LearnedPolicy;
    const count=policy.version===1?12:policy.version===2?19:policy.version===3?21:policy.version===4?FEATURE_COUNT:0;
    if (!count || policy.weights.length !== count || !policy.weights.every(Number.isFinite) || policy.episodes < 1) return undefined;
    return policy;
  } catch { return undefined; }
}

export interface TrainingStatus {
  phase?:'training'|'candidate-evaluation'|'incumbent-evaluation'|'saving'|'done';
  evaluationProgress?:EvaluationProgress;
  seed?: number;
  horizon?: number;
  evaluationHorizon?: number;
  evaluationGames?: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  completed: number; total: number; reward: number; error?: string;
  policy?: LearnedPolicy;
  promotion?: {promoted:boolean;reason:string};
  candidateEvaluation?: LearnedPolicy['evaluation'];
  curriculum?: {episodes:number;resolved:number;wins:number};
}
export const training: TrainingStatus = { status: 'idle', completed: 0, total: 0, reward: 0 };
const channel=new TrainingChannel(path.join(path.dirname(MODEL_PATH),'training-runtime'));
export function trainingStatus(){return training.status==='running'?training:channel.read()??training;}

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}

export interface EvaluationProgress {completed:number;total:number;seat:number;trained:boolean;turn:number;horizon:number;seed:string}
export async function evaluate(policy: LearnedPolicy, games = 24, horizon = 60, factions = 4,onProgress?:(progress:EvaluationProgress)=>void) {
  if (!Number.isInteger(games) || games < 1 || !Number.isInteger(horizon) || horizon < 1) throw new Error('INVALID_EVALUATION_BUDGET');
  if(!Number.isInteger(factions)||factions<2||factions>16)throw new Error('INVALID_FACTION_COUNT');
  let wins=0, baselineWins=0, counties=0, unresolved=0;
  const bySeat = Array.from({length:factions}, (_, seat) => ({seat,faction:'', games:0, wins:0, unresolved:0,countyTotal:0,survivors:0}));
  const trials:{seed:string;seat:number;trained:boolean;turns:number;status:string;winner:string|null;counties:number;survived:boolean}[]=[];
  // Each held-out world is reused for all seats, and again for both policies.
  // This avoids confounding faction performance with a different world seed.
  for (const {seed,seat} of evaluationSchedule(games,factions)) {
    for (const trained of [true,false]) {
      let state=generateBattle(seed,7,5,factions,0);
      delete state.map;
      const id=state.agents[seat]!.id;
      const report=()=>onProgress?.({completed:trials.length,total:games*2,seat,trained,turn:state.turn,horizon,seed});
      report();
      while (state.status==='active' && state.turn < horizon) {
        const actions=state.agents.filter(a=>a.active).map(a=>({agentId:a.id,
          action: trained && a.id===id ? chooseLearned(state,a,policy) : chooseAction(state,a,.25)}));
        state=resolveTurn(state,actions,state.version).state;
        if(state.turn%25===0){report();await new Promise<void>(resolve=>setImmediate(resolve));}
      }
      // A training budget is not a campaign victory condition.
      const counts=state.agents.map(a=>state.cities.filter(c=>c.owner===a.id).length);
      const credit=Number(state.status === 'completed' && state.winner === id);
      trials.push({seed,seat,trained,turns:state.turn,status:state.status,winner:state.winner??null,
        counties:counts[seat]!,survived:state.agents[seat]!.active});
      report();
      if (trained) {
        wins+=credit; counties+=counts[seat]!;
        const row = bySeat[seat]!; row.games++; row.wins += credit;
        row.faction=state.agents[seat]!.name;row.countyTotal+=counts[seat]!;
        row.survivors+=Number(state.agents[seat]!.active);
        if (state.status === 'active') { unresolved++; row.unresolved++; }
      } else baselineWins+=credit;
      await new Promise<void>(resolve=>setImmediate(resolve));
    }
  }
  return { games, horizon, factions,protocol:'paired-world-seat-v2',trials, winRate:wins/games, baselineWinRate:baselineWins/games, meanCounties:counties/games, unresolvedRate:unresolved/games,
    bySeat:bySeat.map(({countyTotal,survivors,...row})=>({...row,meanCounties:row.games?countyTotal/row.games:0,survivalRate:row.games?survivors/row.games:0})) };
}

export async function train(episodes: number, requestedSeed?:number,options:{horizon?:number;evaluationHorizon?:number;evaluationGames?:number}={}) {
  return startTraining(episodes,requestedSeed,options).done;
}
export function startTraining(episodes: number, requestedSeed?:number,options:{horizon?:number;evaluationHorizon?:number;evaluationGames?:number}={}) {
  if (!Number.isInteger(episodes) || episodes < 1 || episodes > 2000) throw new Error('INVALID_TRAINING_BUDGET');
  const horizon=options.horizon??120,evaluationHorizon=options.evaluationHorizon??120;
  if(!Number.isInteger(horizon)||horizon<1||horizon>5000)throw new Error('INVALID_TRAINING_HORIZON');
  if(!Number.isInteger(evaluationHorizon)||evaluationHorizon<1||evaluationHorizon>5000)throw new Error('INVALID_EVALUATION_BUDGET');
  const evaluationGames=options.evaluationGames??48;
  if(evaluationGames>512)throw new Error('INVALID_EVALUATION_BUDGET');
  evaluationSchedule(evaluationGames,16);
  if (training.status==='running') throw new Error('TRAINING_BUSY');
  const seed=trainingSeed(requestedSeed);
  const lease=channel.claim();
  training.seed=seed;
  training.horizon=horizon;training.evaluationHorizon=evaluationHorizon;
  training.evaluationGames=evaluationGames;
  training.status='running'; training.completed=0; training.total=episodes; training.reward=0; training.error=undefined;
  training.phase='training';training.evaluationProgress=undefined;
  training.promotion=undefined;training.candidateEvaluation=undefined;
  const curriculum=training.curriculum={episodes:0,resolved:0,wins:0};
  const random=seeded(seed);
  let published=0;
  const publish=(force=false)=>{if(force||Date.now()-published>1000){lease.publish(training);published=Date.now();}};
  const done=(async()=>{
  try {
    publish(true);
    const previous=await loadPolicy();
    const policy=previous ? upgradePolicy(previous) : newPolicy();
    const priorEpisodes=policy.episodes;
    // Frozen opponent snapshot avoids a moving target within each episode.
    const opponent=structuredClone(policy);
    for (let episode=0;episode<episodes;episode++) {
      let state=generateBattle(`training-${seed}-${priorEpisodes+episode}`,7,5,16,0);
      delete state.map;
      const learner=(priorEpisodes+episode)%16;
      const local=episode%3===0;
      if(local){state=endgameScenario(state,learner,18,(Math.floor((priorEpisodes+episode)/16)+learner)%2===1);curriculum.episodes++;}
      const pending:Transition[]=[];
      let totalReward=0;
      while(state.status==='active' && state.turn < horizon && state.agents[learner]!.active) {
        const agent=state.agents[learner]!;
        const epsilon=.35*(1-episode/episodes)+.05;
        const actions=state.agents.filter(a=>a.active).map(a=>({agentId:a.id,
          action:a.id===agent.id ? chooseLearned(state,a,policy,epsilon,random) :
            episode%2===0 || opponent.episodes===0 ? chooseAction(state,a,random()) : chooseLearned(state,a,opponent,.05,random)}));
        const after=resolveTurn(state,actions,state.version).state;
        const decision=actions.find(a=>a.agentId===agent.id);
        if(decision) learn(policy,state,after,agent,decision.action,pending,after.turn>=horizon);
        totalReward+=after.cities.filter(c=>c.owner===agent.id).length-state.cities.filter(c=>c.owner===agent.id).length;
        state=after;
      }
      training.completed=episode+1; training.reward=totalReward;
      if(local&&state.status==='completed'){
        curriculum.resolved++;
        curriculum.wins+=Number(state.winner===state.agents[learner]!.id);
      }
      publish(true);
      await new Promise<void>(resolve=>setImmediate(resolve));
    }
    policy.episodes=priorEpisodes+episodes; policy.trainedAt=new Date().toISOString();
    policy.algorithm=`Linear greedy-target tree backup / self-play (${RETURN_STEPS}-step, gamma ${RETURN_DISCOUNT})`;
    const progress=(value:EvaluationProgress)=>{training.evaluationProgress=value;publish();};
    training.phase='candidate-evaluation';
    const candidateEvaluation=await evaluate(policy,evaluationGames,evaluationHorizon,16,progress);
    policy.evaluation=candidateEvaluation;
    training.phase='incumbent-evaluation';training.evaluationProgress=undefined;
    const incumbentEvaluation=previous?await evaluate(previous,evaluationGames,evaluationHorizon,16,progress):undefined;
    const promotion=incumbentEvaluation?promotionDecision(candidateEvaluation,incumbentEvaluation):{promoted:true,reason:'initial-checkpoint'};
    training.phase='saving';
    await mkdir(path.dirname(MODEL_PATH),{recursive:true});
    const history = path.join(path.dirname(MODEL_PATH), 'training-history');
    await mkdir(history, {recursive:true});
    if (previous) await writeFile(path.join(history, `before-${Date.now()}-${previous.episodes}.json`), JSON.stringify(previous,null,2)+'\n');
    await writeFile(path.join(history, `run-${Date.now()}-${seed}-${policy.episodes}.json`), JSON.stringify({seed, episodes,horizon,evaluationHorizon,evaluationGames,curriculum:training.curriculum, policy,incumbentEvaluation,promotion},null,2)+'\n');
    if(promotion.promoted){
      await writeFile(`${MODEL_PATH}.tmp`,JSON.stringify(policy,null,2)+'\n');
      await rename(`${MODEL_PATH}.tmp`,MODEL_PATH);
    }
    training.promotion=promotion;training.candidateEvaluation=candidateEvaluation;
    training.policy=promotion.promoted?policy:previous!; training.status='completed';
    training.phase='done';
    return training.policy;
  } catch(error) {
    training.status='failed'; training.error=error instanceof Error?error.message:String(error); throw error;
  } finally {
    try{publish(true);}finally{lease.release();}
  }
  })();
  return {done};
}
