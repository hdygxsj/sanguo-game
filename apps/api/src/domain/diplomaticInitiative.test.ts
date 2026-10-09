import {expect,it} from 'vitest';
import {diplomaticInitiative,relationBetween,validateDiplomacy} from './diplomacy.js';
import type {BattleState} from './types.js';
function setup():BattleState{return {seed:'peace-stagnation',version:28,turn:28,maxTurns:0,columns:3,rows:1,status:'active',winner:null,resources:{a:100,b:100},agents:[{id:'a',name:'A',color:'#fff',active:true,strategy:'balanced'},{id:'b',name:'B',color:'#000',active:true,strategy:'balanced'}],diplomacy:{'a:b':{status:'peace',relation:10,trade:true,truceUntil:6}},cities:[0,1,2].map(id=>({id,name:String(id),x:id,z:0,adjacent:id===0?[1]:id===1?[0,2]:[1],owner:id===0?'a':'b',troops:id===0?30:id===1?5:20,level:1,terrain:'plain',weather:'clear',resourceTrait:null,imperial:false,defenseMultiplier:1.12}))};}
it('reopens a viable border after a long peace without requiring overwhelming national strength',()=>{
  const s=setup(),before=structuredClone(s),action=diplomaticInitiative(s,'a');
  expect(action).toEqual({type:'diplomacy',targetAgentId:'b',treaty:'war',offer:0});
  expect(validateDiplomacy(s,'a',action as Extract<NonNullable<typeof action>,{type:'diplomacy'}>).ok).toBe(true);
  expect(s).toEqual(before);
});
it('honors unexpired truces, grace period, alliances and player ownership',()=>{
  const s=setup(),relation=relationBetween(s,'a','b');
  relation.truceUntil=30;expect(diplomaticInitiative(s,'a')).toBeUndefined();
  relation.truceUntil=22;expect(diplomaticInitiative(s,'a')).toBeUndefined();
  relation.truceUntil=6;relation.status='alliance';expect(diplomaticInitiative(s,'a')).toBeUndefined();
  relation.status='peace';s.playerAgentId='a';expect(diplomaticInitiative(s,'a')).toBeUndefined();
});
it('does not open an opportunistic war when another front is available or money is low',()=>{
  const s=setup();s.cities.push({...s.cities[2]!,id:3,owner:null,adjacent:[0]});s.cities[0]!.adjacent.push(3);
  expect(diplomaticInitiative(s,'a')).toBeUndefined();
  s.cities[0]!.adjacent=[1];s.resources.a=39;
  expect(diplomaticInitiative(s,'a')).toBeUndefined();
});
it('does not use distant power to justify an unwinnable border assault',()=>{
  const s=setup();s.cities[0]!.troops=20;s.cities[1]!.troops=20;s.cities[2]!.troops=0;
  expect(diplomaticInitiative(s,'a')).toBeUndefined();
});
it('reassesses an isolated old alliance only after its longer protection period',()=>{
  const s=setup();s.diplomacy!['a:b']!.status='alliance';
  s.turn=42;expect(diplomaticInitiative(s,'a')).toBeUndefined();
  s.turn=49;
  expect(diplomaticInitiative(s,'a')).toEqual({type:'diplomacy',targetAgentId:'b',treaty:'war',offer:0});
  s.cities.push({...s.cities[2]!,id:3,owner:null,adjacent:[0]});s.cities[0]!.adjacent.push(3);
  expect(diplomaticInitiative(s,'a')).toBeUndefined();
});
