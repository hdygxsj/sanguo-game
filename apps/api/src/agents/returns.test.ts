import {expect,it} from 'vitest';
import {newPolicy,learn,chooseLearned} from './learning.js';
import {updateReturn,RETURN_DISCOUNT,RETURN_STEPS,type Transition} from './returns.js';
import {generateBattle} from '../domain/generate.js';

it('retains useful credit for a conquest twenty turns after mobilization',()=>{
  const policy=newPolicy(),f=Array(23).fill(0);f[7]=1;
  const steps=Array.from({length:20},(_,i)=>({features:i===0?f:Array(23).fill(0),reward:i===19?2:0}));
  updateReturn(policy,steps,0);
  expect(policy.weights[7]).toBeGreaterThan(.02);
});
it('waits for the full march-credit window before updating a nonterminal return',()=>{
  const state=generateBattle('long-return-window',7,5,4),agent=state.agents[0]!;
  const policy=newPolicy(),pending:Transition[]=Array.from({length:RETURN_STEPS-2},()=>({features:Array(23).fill(0),reward:0}));
  learn(policy,state,state,agent,{type:'hold'},pending);
  expect(pending).toHaveLength(RETURN_STEPS-1);
  learn(policy,state,state,agent,{type:'hold'},pending);
  expect(pending).toHaveLength(RETURN_STEPS-1);
});

it('credits a delayed conquest reward to the original decision',()=>{
  const policy=newPolicy(),f=Array(19).fill(0);f[7]=1;
  updateReturn(policy,[{features:f,reward:0},{features:Array(19).fill(0),reward:2}],0);
  expect(policy.weights[7]).toBeCloseTo(.035*RETURN_DISCOUNT*2/2);
  expect(policy.weights[1]).toBe(0);
});

it('flushes remaining actions at a real terminal state without a bootstrap',()=>{
  const before=generateBattle('terminal-return',7,5,4,0),agent=before.agents[0]!;
  const after=structuredClone(before);after.status='completed';after.winner=agent.id;
  const policy=newPolicy(),f=Array(19).fill(0);f[7]=1;
  const pending:Transition[]=[{features:f,reward:0}];
  learn(policy,before,after,agent,{type:'hold'},pending);
  expect(pending).toHaveLength(0);
  expect(policy.weights[7]).toBeCloseTo(.035*RETURN_DISCOUNT*3/2);
  expect(policy.weights[1]).toBeGreaterThan(0);
});

it('does not update an unfinished short return until the training horizon flush',()=>{
  const before=generateBattle('horizon-return',7,5,4,0),agent=before.agents[0]!;
  const after=structuredClone(before);after.resources[agent.id]!+=10;
  const policy=newPolicy(),pending:Transition[]=[];
  learn(policy,before,after,agent,{type:'hold'},pending);
  expect(pending).toHaveLength(1);
  expect(policy.weights.every(w=>w===0)).toBe(true);
  learn(policy,before,after,agent,{type:'hold'},pending,true);
  expect(pending).toHaveLength(0);
  expect(policy.weights[1]).toBeGreaterThan(0);
});

it('discounts the bootstrap by the full transition count',()=>{
  const policy=newPolicy(),f=Array(19).fill(0);f[2]=1;
  updateReturn(policy,[{features:f,reward:0},{features:f,reward:0}],1);
  expect(policy.weights[2]).toBeCloseTo(.035*RETURN_DISCOUNT**2/2);
});

it('does not attribute rewards after a non-target action to an earlier greedy decision',()=>{
  const policy=newPolicy(),f=Array(23).fill(0);f[7]=1;
  updateReturn(policy,[{features:f,reward:1},
    {features:Array(23).fill(0),reward:-100,bootstrapBefore:4},
    {features:Array(23).fill(0),reward:-100}],0);
  expect(policy.weights[7]).toBeCloseTo(.035*(1+RETURN_DISCOUNT*4)/2);
});

it('still learns the immediate outcome of the exploratory action itself',()=>{
  const policy=newPolicy(),f=Array(23).fill(0);f[7]=1;
  updateReturn(policy,[{features:f,reward:2,bootstrapBefore:100}],0);
  expect(policy.weights[7]).toBeCloseTo(.035*2/2);
});

it('records a target-policy bootstrap when the sampled action has lower value',()=>{
  const state=generateBattle('off-policy-boundary',7,5,2,0),agent=state.agents[0]!;
  const policy=newPolicy();policy.weights[1]=2;
  expect(chooseLearned(state,agent,policy)).toEqual({type:'hold'});
  const city=state.cities.find(c=>c.owner===agent.id)!;
  const pending:Transition[]=[];
  learn(policy,state,state,agent,{type:'recruit',cityId:city.id,amount:1},pending);
  expect(pending[0]).toHaveProperty('bootstrapBefore',2);
});
