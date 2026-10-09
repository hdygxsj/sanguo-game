import { expect, it } from 'vitest';
import { evaluate,train } from './training.js';
import { newPolicy, features } from './learning.js';
import { generateBattle } from '../domain/generate.js';
it('reports paired evaluation progress without changing evaluation results',async()=>{
  const progress:{completed:number;total:number;turn:number;seat:number;trained:boolean}[]=[];
  const result=await evaluate(newPolicy(),2,1,2,p=>progress.push({...p}));
  expect(progress.length).toBeGreaterThanOrEqual(8);
  expect(progress[0]).toMatchObject({completed:0,total:4,turn:0,seat:0,trained:true});
  expect(progress.at(-1)).toMatchObject({completed:4,total:4,turn:1,seat:1,trained:false});
  expect(progress.every((p,i)=>!i||p.completed>=progress[i-1]!.completed)).toBe(true);
  expect(result.trials).toHaveLength(4);
  expect(result.unresolvedRate).toBe(1);
});

it('reports horizon exhaustion as unresolved, never as a territorial victory', async () => {
  const result = await evaluate(newPolicy(), 4, 1);
  expect(result.winRate).toBe(0);
  expect(result.unresolvedRate).toBe(1);
  expect(result.bySeat).toHaveLength(4);
  expect(result.bySeat.every(s => s.games === 1 && s.wins === 0 && s.unresolved === 1)).toBe(true);
  expect(result.protocol).toBe('paired-world-seat-v2');
  expect(result.trials).toHaveLength(8);
  expect(new Set(result.trials.map(t=>t.seed)).size).toBe(1);
  for(let seat=0;seat<4;seat++){
    const pair=result.trials.filter(t=>t.seat===seat);
    expect(pair.map(t=>t.trained)).toEqual([true,false]);
    expect(pair.every(t=>t.turns===1&&t.status==='active'&&t.winner===null)).toBe(true);
  }
});

it('rejects invalid evaluation budgets rather than dividing by zero', async () => {
  await expect(evaluate(newPolicy(), 0, 1)).rejects.toThrow('INVALID_EVALUATION_BUDGET');
});
it('rejects invalid training horizons before starting a run or writing a checkpoint',async()=>{
  for(const horizon of [0,-1,1.5,5001,NaN]){
    // Invalid seed is a second safety gate: pre-fix code must not run training.
    await expect(train(1,-1,{horizon})).rejects.toThrow('INVALID_TRAINING_HORIZON');
  }
});

it('evaluates every historical faction seat when requested',async()=>{
  const result=await evaluate(newPolicy(),16,1,16);
  expect(result.bySeat).toHaveLength(16);
  expect(result.bySeat.every(row=>row.games===1&&row.unresolved===1)).toBe(true);
  expect(result.bySeat.map(row=>row.faction)).toContain('曹操');
  expect(result.bySeat.every(row=>Number.isFinite(row.meanCounties)&&row.meanCounties>0&&row.survivalRate===1)).toBe(true);
  expect(result.bySeat.reduce((sum,row)=>sum+row.meanCounties*row.games,0)/result.games).toBeCloseTo(result.meanCounties);
});

it('keeps development features finite without a campaign turn limit', () => {
  const state = generateBattle('infinite-features', 7, 5, 4, 0);
  const agent = state.agents[0]!;
  const city = state.cities.find(c => c.owner === agent.id)!;
  expect(features(state, agent, { type: 'develop', cityId: city.id }).every(Number.isFinite)).toBe(true);
});
