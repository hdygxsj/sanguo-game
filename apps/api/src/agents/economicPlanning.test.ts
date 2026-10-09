import {expect,it} from 'vitest';
import * as planning from './economicPlanning.js';
import type {BattleState} from '../domain/types.js';
import {resolveTurn} from '../domain/resolveTurn.js';
import {fiscalEstimate} from '../domain/economy.js';
function setup():BattleState{return {seed:'economy-plan',version:5,turn:5,maxTurns:0,columns:3,rows:1,status:'active',winner:null,resources:{a:100,b:100},agents:[{id:'a',name:'A',color:'#fff',active:true,strategy:'balanced'},{id:'b',name:'B',color:'#000',active:true,strategy:'balanced'}],cities:[0,1,2].map(id=>({id,name:String(id),x:id,z:0,adjacent:id===0?[1]:id===1?[0,2]:[1],owner:id===2?'b':'a',troops:id===2?20:4,level:1,terrain:id===0?'farmland':'plain',weather:'clear',resourceTrait:null,imperial:false,defenseMultiplier:1.12}))};}
it('invests in a safe profitable farm without mutating the state',()=>{
  expect(planning.economicInitiative).toBeTypeOf('function');
  const s=setup(),before=structuredClone(s);
  expect(planning.economicInitiative(s,'a')).toEqual({type:'develop',cityId:0,building:'farm'});
  expect(s).toEqual(before);
});
it('preserves cash, leaves player decisions alone and does not spend every turn',()=>{
  expect(planning.economicInitiative).toBeTypeOf('function');
  const s=setup();s.resources.a=35;expect(planning.economicInitiative(s,'a')).toBeUndefined();
  s.resources.a=100;s.playerAgentId='a';expect(planning.economicInitiative(s,'a')).toBeUndefined();
  delete s.playerAgentId;s.turn=6;expect(planning.economicInitiative(s,'a')).toBeUndefined();
});
it('does not build under an incoming enemy army or overfill the construction pipeline',()=>{
  expect(planning.economicInitiative).toBeTypeOf('function');
  const s=setup();s.armies=[{id:'enemy',owner:'b',troops:12,route:[2,1,0],leg:0,progress:0,speed:.7}];
  expect(planning.economicInitiative(s,'a')).toBeUndefined();
  s.armies=[];for(const city of s.cities.filter(c=>c.owner==='a'))city.construction={building:'farm',level:1,completesTurn:7};
  expect(planning.economicInitiative(s,'a')).toBeUndefined();
});
it('pays for a project and improves actual fiscal income only after completion',()=>{
  const s=setup(),before=fiscalEstimate(s.cities.filter(c=>c.owner==='a')).net;
  const action=planning.economicInitiative(s,'a')!;
  const started=resolveTurn(s,[{agentId:'a',action}],s.version).state;
  expect(started.cities[0]!.buildings?.farm??0).toBe(0);
  expect(started.cities[0]!.construction?.building).toBe('farm');
  expect(started.resources.a).toBeLessThan(s.resources.a!);
  const completed=resolveTurn(started,[],started.version).state;
  expect(completed.cities[0]!.buildings?.farm).toBe(1);
  expect(fiscalEstimate(completed.cities.filter(c=>c.owner==='a')).net-before).toBe(3);
});
it('rejects poor payback even when cash is abundant',()=>{
  const s=setup();s.resources.a=1000;s.cities[0]!.terrain='plain';s.cities[0]!.buildings={farm:2};
  expect(planning.economicInitiative(s,'a')).toBeUndefined();
});
