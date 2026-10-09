import {describe,it,expect} from 'vitest';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {advanceArmies} from './marching.js';
import type {BattleState,ArmyState} from './types.js';
function world():BattleState{return {seed:'field',version:0,turn:0,maxTurns:0,columns:3,rows:1,status:'active',winner:null,agents:['a','b'].map(id=>({id,name:id,color:'#fff',strategy:'balanced',active:true})),resources:{a:1000,b:1000},cities:[0,1,2].map(id=>({id,name:`城${id}`,x:id*4,z:0,adjacent:id===1?[0,2]:[1],terrain:'plain',weather:'clear',resourceTrait:null,owner:id<2?'a':'b',troops:30,level:1,defenseMultiplier:1.12,imperial:false}))};}
function army():ArmyState{return {id:'first',owner:'a',troops:12,units:{spear:12},route:[0,1],leg:0,progress:.4,speed:.7,persistent:true,stance:'camp',halted:true};}
describe('independent field armies',()=>{
 it('intercepts waypoint-bound armies at intermediate cities before any siege',()=>{
  const s=world();s.cities[1]!.owner='b';s.cities[1]!.troops=1;
  s.armies=[{...army(),troops:5,units:{spear:5},route:[0,1,2],progress:.9,stance:'march',halted:false,stopProgress:.5},{...army(),id:'defender',owner:'b',troops:50,units:{spear:50},route:[1,1],progress:0}];
  const events:any[]=[];advanceArmies(s,e=>events.push(e));
  expect(s.cities[1]!.owner).toBe('b');expect(events.some(e=>e.type==='attack'||e.type==='capture')).toBe(false);expect(s.armies!.some(a=>a.owner==='a')).toBe(false);
 });
 it('settles simultaneous intermediate junction encounters before a waypoint-bound siege',()=>{
  const s=world();s.cities[1]!.owner='b';s.cities[1]!.troops=1;
  s.armies=[{...army(),troops:5,units:{spear:5},route:[0,1,2],progress:0,speed:4,stance:'march',halted:false,stopProgress:.5},{...army(),id:'defender',owner:'b',troops:50,units:{spear:50},route:[2,1,0],progress:0,speed:4,stance:'march',halted:false}];
  const events:any[]=[];advanceArmies(s,e=>events.push(e));expect(s.cities[1]!.owner).toBe('b');expect(events.some(e=>e.type==='capture')).toBe(false);expect(events[0]?.type).toBe('field-battle');
 });
 it('raises a separate army without creating soldiers or deleting city defences',()=>{const s=world();const r=resolveTurn(s,[{agentId:'a',action:{type:'raise-army',cityId:0}}],0);expect(r.state.armies).toHaveLength(1);expect(r.state.armies![0]).toMatchObject({persistent:true,stance:'camp',troops:6,route:[0,0]});expect(r.state.cities[0]!.troops).toBe(24);});
 it('keeps a field camp stationary across turns',()=>{const s=world();s.armies=[army()];const r=resolveTurn(s,[],0);expect(r.state.armies![0]).toMatchObject({progress:.4,halted:true,stance:'camp',troops:12});});
 it('recruits into the selected army, never its neighbouring city',()=>{const s=world();s.armies=[army()];const r=resolveTurn(s,[{agentId:'a',action:{type:'recruit-army',armyId:'first',amount:3,unitType:'archer'}}],0);expect(r.state.armies![0]!.troops).toBe(15);expect(r.state.armies![0]!.units!.archer).toBe(3);expect(r.state.cities[0]!.troops).toBe(30);expect(s.armies[0]!.troops).toBe(12);});
 it('rejects foreign-army orders and recruiting on an enemy road or while marching',()=>{const s=world();s.armies=[army()];const action={type:'recruit-army' as const,armyId:'first',amount:3};expect(validateAction(s,'b',action).ok).toBe(false);s.armies[0]!.halted=false;expect(validateAction(s,'a',action).ok).toBe(false);s.armies[0]!.halted=true;s.cities[1]!.owner='b';expect(validateAction(s,'a',action).ok).toBe(false);});
 it('redirects a field army without teleporting, then keeps it separate at its destination',()=>{const s=world();s.armies=[army()];let r=resolveTurn(s,[{agentId:'a',action:{type:'order-army',armyId:'first',toCityId:0}}],0);expect(r.state.armies![0]).toMatchObject({route:[1,0]});expect(r.state.armies![0]!.progress).toBeCloseTo(.775);for(let i=0;i<2;i++)r=resolveTurn(r.state,[],r.state.version);expect(r.state.armies![0]).toMatchObject({route:[0,0],progress:0,halted:true,stance:'camp',troops:12});expect(r.state.cities[0]!.troops).toBe(30);});
 it('stops at a road waypoint before attacking its destination',()=>{const s=world();s.armies=[{...army(),route:[1,2],progress:0}];let r=resolveTurn(s,[{agentId:'a',action:{type:'order-army',armyId:'first',toCityId:2,stopProgress:.3}}],0);r=resolveTurn(r.state,[],r.state.version);expect(r.state.armies![0]).toMatchObject({progress:.3,halted:true,stance:'camp'});expect(r.state.cities[2]!.troops).toBe(30);});
 it('applies a single ambush advantage when enemies reach the camp, not city defence',()=>{const s=world();s.armies=[{...army(),stance:'ambush',progress:.5,troops:10,units:{spear:10}},{...army(),id:'enemy',owner:'b',persistent:false,stance:'march',halted:false,route:[1,0],progress:.4,troops:10,units:{spear:10}}];const events:any[]=[];advanceArmies(s,e=>events.push(e));expect(s.armies).toHaveLength(1);expect(s.armies![0]).toMatchObject({owner:'a',stance:'camp'});expect(events.some(e=>e.message.includes('伏击'))).toBe(true);});
 it('does not use fresh recruits to win combat in the same turn',()=>{const s=world();s.armies=[{...army(),progress:.5,troops:5,units:{spear:5}},{...army(),id:'enemy',owner:'b',persistent:false,stance:'march',halted:false,route:[1,0],progress:.4,troops:10,units:{spear:10}}];const r=resolveTurn(s,[{agentId:'a',action:{type:'recruit-army',armyId:'first',amount:50}}],0);expect(r.state.armies?.some(a=>a.id==='first')).toBe(false);expect(r.events.some(e=>e.type==='recruit'&&e.message.includes('退还'))).toBe(true);});
});
