import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import type {BattleAction} from './types.js';
import {atWar} from './diplomacy.js';

const propose=(targetAgentId:string,treaty:string,offer=0)=>({type:'diplomacy',targetAgentId,treaty,offer} as BattleAction);
function fixture(){
  const state=generateBattle('diplomacy',7,5,2);
  state.resources={'agent-1':1000,'agent-2':1000};
  return state;
}

it('accepts a funded ceasefire and prevents attack orders and immediate redeclaration',()=>{
  const state=fixture();
  const next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  const from=next.cities.find(c=>c.owner==='agent-1')!,to=next.cities.find(c=>c.owner==='agent-2')!;
  expect(validateAction(next,'agent-1',{type:'attack',fromCityId:from.id,toCityId:to.id,troops:2})).toEqual({ok:false,code:'NOT_AT_WAR'});
  expect(validateAction(next,'agent-1',propose('agent-2','war')).ok).toBe(false);
  expect(next.diplomacy).toBeDefined();
  expect(state.diplomacy?.['agent-1:agent-2']).toBeUndefined();
});

it('holds an offer to the player in escrow, then refunds a rejection',()=>{
  const state=fixture();state.playerAgentId='agent-2';
  const next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  expect(next.diplomaticOffers).toHaveLength(1);
  const offer=next.diplomaticOffers![0]!;
  expect(validateAction(next,'agent-1',{type:'respond-diplomacy',offerId:offer.id,accept:true} as BattleAction).ok).toBe(false);
  const noReply=resolveTurn(next,[],1).state;
  const reply=resolveTurn(next,[{agentId:'agent-2',action:{type:'respond-diplomacy',offerId:offer.id,accept:false} as BattleAction}],1).state;
  expect(reply.diplomaticOffers).toHaveLength(0);
  expect(reply.resources['agent-1']!-noReply.resources['agent-1']!).toBe(100);
});

it('pays both parties trade income without duplicating a symmetric pact',()=>{
  const state=fixture();
  let next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  const result=resolveTurn(next,[{agentId:'agent-1',action:propose('agent-2','trade',100)}],1);
  expect(result.events.filter(e=>e.type==='trade-income')).toHaveLength(2);
  expect(validateAction(result.state,'agent-2',propose('agent-1','trade')).ok).toBe(false);
});

it('does not let a marching army capture a city after peace has been agreed',()=>{
  const state=fixture(),from=state.cities.find(c=>c.owner==='agent-1')!,to=state.cities.find(c=>c.owner==='agent-2')!;
  from.x=0;from.z=0;to.x=.2;to.z=0;
  state.armies=[{id:'incoming',owner:'agent-1',troops:100,route:[from.id,to.id],leg:0,progress:.5,speed:.7}];
  const result=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0);
  expect(result.state.cities[to.id]!.owner).toBe('agent-2');
  expect(result.state.armies?.[0]?.halted).toBe(true);
  expect(result.events.some(e=>e.type==='capture')).toBe(false);
});

it('refunds an expired offer exactly once and removes it from the inbox',()=>{
  const state=fixture();state.playerAgentId='agent-2';
  let next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  next.turn=next.diplomaticOffers![0]!.expiresTurn-1;
  const result=resolveTurn(next,[],next.version);
  expect(result.state.diplomaticOffers).toHaveLength(0);
  expect(result.events.filter(e=>e.type==='diplomacy'&&e.amount===100)).toHaveLength(1);
  expect(resolveTurn(result.state,[],result.state.version).events.filter(e=>e.type==='diplomacy'&&e.amount===100)).toHaveLength(0);
});

it('requires the player to accept a proposal before it changes the relation',()=>{
  const state=fixture();state.playerAgentId='agent-2';
  const next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  expect(atWar(next,'agent-1','agent-2')).toBe(true);
  const id=next.diplomaticOffers![0]!.id;
  const accepted=resolveTurn(next,[{agentId:'agent-2',action:{type:'respond-diplomacy',offerId:id,accept:true}}],1).state;
  expect(atWar(accepted,'agent-1','agent-2')).toBe(false);
  expect(accepted.diplomaticOffers).toHaveLength(0);
});

it('allows declaration after the truce and ends bilateral trade immediately',()=>{
  const state=fixture();
  let next=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0).state;
  next=resolveTurn(next,[{agentId:'agent-1',action:propose('agent-2','trade',100)}],1).state;
  next.turn=20;
  const result=resolveTurn(next,[{agentId:'agent-1',action:propose('agent-2','war')}],next.version);
  expect(atWar(result.state,'agent-1','agent-2')).toBe(true);
  expect(result.events.filter(e=>e.type==='trade-income')).toHaveLength(0);
});

it('lets peaceful field armies cross without a battle',()=>{
  const state=fixture(),a=state.cities.find(c=>c.owner==='agent-1')!,b=state.cities.find(c=>c.owner==='agent-2')!;
  a.x=0;a.z=0;b.x=1;b.z=0;
  state.armies=[{id:'a',owner:'agent-1',troops:20,route:[a.id,b.id],leg:0,progress:0,speed:.7},{id:'b',owner:'agent-2',troops:20,route:[b.id,a.id],leg:0,progress:0,speed:.7}];
  const result=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','peace',100)}],0);
  expect(result.events.some(e=>e.type==='field-battle')).toBe(false);
  expect(result.state.armies).toHaveLength(2);
  expect(result.state.armies!.every(a=>a.troops===20)).toBe(true);
});

it('still lets a third-party enemy intercept an army halted at a peaceful border',()=>{
  const state=generateBattle('border-clash',7,5,3);
  state.resources={'agent-1':1000,'agent-2':1000,'agent-3':1000};
  const from=state.cities.find(c=>c.owner==='agent-1')!,to=state.cities.find(c=>c.owner==='agent-3')!;
  from.x=0;from.z=0;to.x=2;to.z=0;
  state.diplomacy={'agent-1:agent-3':{status:'peace',relation:10,trade:false,truceUntil:8}};
  state.armies=[{id:'halted',owner:'agent-1',troops:20,route:[from.id,to.id],leg:0,progress:1,speed:.7,halted:true},
    {id:'enemy',owner:'agent-2',troops:10,route:[to.id,from.id],leg:0,progress:0,speed:.7}];
  const result=resolveTurn(state,[],0);
  expect(result.events.some(e=>e.type==='field-battle')).toBe(true);
  expect(result.state.armies).toHaveLength(1);
  expect(result.state.armies![0]!.troops).toBe(10);
});

it('resolves co-located halted enemies even when no army is moving',()=>{
  const state=generateBattle('halted-war',7,5,3);
  const a=state.cities.find(c=>c.owner==='agent-1')!,b=state.cities.find(c=>c.owner==='agent-2')!,host=state.cities.find(c=>c.owner==='agent-3')!;
  const peace={status:'peace' as const,relation:10,trade:false,truceUntil:0};
  state.diplomacy={'agent-1:agent-2':{...peace},'agent-1:agent-3':{...peace},'agent-2:agent-3':{...peace}};
  state.armies=[{id:'a',owner:'agent-1',troops:20,route:[a.id,host.id],leg:0,progress:1,speed:.7,halted:true},
    {id:'b',owner:'agent-2',troops:10,route:[b.id,host.id],leg:0,progress:1,speed:.7,halted:true}];
  const result=resolveTurn(state,[{agentId:'agent-1',action:propose('agent-2','war')}],0);
  expect(result.events.some(e=>e.type==='field-battle')).toBe(true);
  expect(result.state.armies).toHaveLength(1);
  expect(result.state.armies![0]!.troops).toBe(10);
});
