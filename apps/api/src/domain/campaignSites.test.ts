import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {historicGeography} from './hanGeography.js';
import {fiscalEstimate} from './economy.js';
import {advanceArmies} from './marching.js';

it('captures a resource site with an arriving army and transfers its garrison and revenue',()=>{
  const state=generateBattle('resource-capture');
  const resource=state.cities.find(c=>c.siteKind==='mine'&&!c.owner)!;
  resource.owner='agent-2';resource.troops=0;
  state.armies=[{id:'capture',owner:'agent-1',troops:20,route:[resource.adjacent[0]!,resource.id],leg:0,progress:1,speed:.7}];
  advanceArmies(state,()=>{});
  expect(resource.owner).toBe('agent-1');expect(resource.troops).toBe(20);
  expect(state.armies).toHaveLength(0);expect(resource.siteKind).toBe('mine');
  expect(fiscalEstimate([resource]).grossRevenue).toBe(3+resource.level*2+6);
});

it('creates 300 capturable sites with dense IDs, all seats and a connected road graph',()=>{
  const state=generateBattle('sites',7,5,16);
  expect(state.cities).toHaveLength(300);
  expect(state.cities.filter(c=>c.seat)).toHaveLength(105);
  expect(new Set(state.cities.map(c=>c.province)).size).toBe(13);
  expect(state.cities.map(c=>c.id)).toEqual(Array.from({length:300},(_,i)=>i));
  for(const kind of ['farm','mine','horse'])expect(state.cities.filter(c=>c.siteKind===kind).length).toBeGreaterThan(10);
  for(const agent of state.agents)expect(state.cities.some(c=>c.seat&&c.owner===agent.id)).toBe(true);
  const seen=new Set([0]),queue=[0];
  while(queue.length){const id=queue.pop()!;for(const next of state.cities[id]!.adjacent){expect(state.cities[next]!.adjacent).toContain(id);if(!seen.has(next)){seen.add(next);queue.push(next);}}}
  expect(seen.size).toBe(300);
});
it('retains the full legacy geography and only credits resources belonging to a faction',()=>{
  expect(historicGeography(()=>.5).cities).toHaveLength(1184);
  const state=generateBattle('resource-ownership');
  const resource=state.cities.find(c=>c.siteKind==='horse'&&!c.owner)!;
  expect(resource).toBeDefined();
  const owned=(id:string)=>fiscalEstimate(state.cities.filter(c=>c.owner===id)).grossRevenue;
  const before=owned('agent-1');resource.owner='agent-1';const captured=owned('agent-1');
  expect(captured-before).toBeGreaterThanOrEqual(6);
  const enemyBefore=owned('agent-2');resource.owner='agent-2';
  expect(owned('agent-1')).toBe(before);expect(owned('agent-2')-enemyBefore).toBeGreaterThanOrEqual(6);
});
