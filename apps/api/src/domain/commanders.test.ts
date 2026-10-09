import {expect,it} from 'vitest';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {characterBudget} from './characters.js';
import type {BattleState} from './types.js';

function fixture():BattleState{return {seed:'commanders',version:0,turn:0,maxTurns:0,columns:3,rows:1,status:'active',winner:null,
  agents:['a','b'].map(id=>({id,name:id,color:'#aaa',strategy:'balanced',active:true})),resources:{a:1000,b:1000},
  cities:[0,1,2].map(id=>({id,name:`城${id}`,x:id*4,z:0,adjacent:id===1?[0,2]:[1],terrain:'plain',weather:'clear',resourceTrait:null,owner:id===0?'a':'b',troops:30,level:1,defenseMultiplier:1,imperial:false})),
  characters:['a','b'].map((owner,i)=>({id:`p${i}`,name:`将${i}`,sex:'male',owner,ruler:false,politics:60,command:i===0?100:0,loyalty:75,governorCityId:null}))};}
const action={type:'attack' as const,fromCityId:0,toCityId:1,troops:20,commanderId:'p0'};
it('allows a commander to escape an exact siege power tie',()=>{
  const s=fixture();s.cities[1]!.x=.1;s.cities[1]!.troops=12;
  const result=resolveTurn(s,[{agentId:'a',action:{...action,troops:10}}],0);
  expect(result.state.characters![0]!.capturedBy).toBeUndefined();
});
it('frees captives when their captor is eliminated and keeps uncommanded combat unchanged',()=>{
  const s=fixture();s.characters![0]!.capturedBy='b';
  for(const c of s.cities)c.owner='a';
  const result=resolveTurn(s,[],0).state;
  expect(result.characters![0]!.capturedBy).toBeUndefined();expect(result.characters![0]!.owner).toBe('a');
});
it('lets rulers escape defeat and never exceeds the bounded command bonus',()=>{
  const s=fixture();s.cities[1]!.x=.1;s.characters![0]!.ruler=true;
  const result=resolveTurn(s,[{agentId:'a',action:{...action,troops:1}}],0);
  expect(result.state.characters![0]!.capturedBy).toBeUndefined();
  s.characters![0]!.command=10000;s.cities[1]!.troops=25;
  expect(resolveTurn(s,[{agentId:'a',action}],0).state.cities[1]!.owner).toBe('b');
});
it('binds one available owned commander and disallows governing while commanding',()=>{
  const s=fixture();expect(validateAction(s,'a',{...action,commanderId:'p1'}).ok).toBe(false);
  const result=resolveTurn(s,[{agentId:'a',action}],0);expect(result.state.armies![0]!.commanderId).toBe('p0');
  expect(validateAction(result.state,'a',{...action,troops:2}).ok).toBe(false);
  expect(validateAction(result.state,'a',{type:'appoint-governor',characterId:'p0',cityId:0}).ok).toBe(false);
  expect(s.armies).toBeUndefined();
});
it('uses command strength without minting soldiers and captures the defeated field general',()=>{
  const s=fixture();s.armies=[{id:'a1',owner:'a',troops:20,commanderId:'p0',route:[0,1],leg:0,progress:.5,speed:.7},{id:'b1',owner:'b',troops:20,commanderId:'p1',route:[1,0],leg:0,progress:.5,speed:.7}];
  const r=resolveTurn(s,[],0);expect(r.state.armies).toHaveLength(1);expect(r.state.armies![0]!.troops).toBe(3);
  expect(r.state.characters![1]!.capturedBy).toBe('a');expect(r.events.some(e=>e.type==='captive')).toBe(true);
  expect(characterBudget(r.state,'b').salary).toBe(0);
});
it('captures a defeated siege commander but releases the command slot on friendly arrival',()=>{
  const s=fixture();s.cities[1]!.x=.1;
  const defeat=resolveTurn(s,[{agentId:'a',action:{...action,troops:5}}],0);
  expect(defeat.state.characters![0]!.capturedBy).toBe('b');
  s.cities[1]!.owner='a';const arrival=resolveTurn(s,[{agentId:'a',action:{...action,type:'move'}}],0).state;
  expect(arrival.armies).toHaveLength(0);expect(arrival.characters![0]!.capturedBy).toBeUndefined();
  expect(validateAction(arrival,'a',{type:'appoint-governor',characterId:'p0',cityId:1}).ok).toBe(true);
});
it('only allows the captor to persuade or release; prisoner cannot serve their old faction',()=>{
  const s=fixture();s.characters![1]!.capturedBy='a';
  expect(validateAction(s,'b',{type:'reward-character',characterId:'p1'}).ok).toBe(false);
  expect(validateAction(s,'b',{type:'release-captive',characterId:'p1'}).ok).toBe(false);
  const persuaded=resolveTurn(s,[{agentId:'a',action:{type:'recruit-captive',characterId:'p1'}}],0).state;
  expect(persuaded.characters![1]!.loyalty).toBe(60);expect(persuaded.characters![1]!.capturedBy).toBe('a');
  persuaded.characters![1]!.loyalty=50;
  const joined=resolveTurn(persuaded,[{agentId:'a',action:{type:'recruit-captive',characterId:'p1'}}],1).state;
  expect(joined.characters![1]!.owner).toBe('a');expect(joined.characters![1]!.capturedBy).toBeUndefined();
  const freed=resolveTurn(s,[{agentId:'a',action:{type:'release-captive',characterId:'p1'}}],0).state;
  expect(freed.characters![1]!.owner).toBe('b');expect(freed.characters![1]!.capturedBy).toBeUndefined();
});
