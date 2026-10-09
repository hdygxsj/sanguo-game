import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {fiscalEstimate} from './economy.js';
import {settleConstruction} from './construction.js';
import type {BattleAction} from './types.js';
const setup=()=>{const s=generateBattle('construction',7,5,2,0);s.resources['agent-1']=500;return s;};
const order=(cityId:number,building='market')=>({type:'develop',cityId,building} as BattleAction);
it('prepays a job and completes it after two settlements without upgrading the city',()=>{
  const s=setup(),city=s.cities.find(c=>c.owner==='agent-1')!,level=city.level;
  const held=resolveTurn(s,[],s.version).state;
  const first=resolveTurn(s,[{agentId:'agent-1',action:order(city.id)}],s.version).state;
  expect(first.resources['agent-1']).toBe(held.resources['agent-1']!-40);
  expect(first.cities[city.id]!.level).toBe(level);
  expect(first.cities[city.id]!.construction).toMatchObject({building:'market',level:1,completesTurn:2});
  expect(first.cities[city.id]!.buildings?.market).toBeUndefined();
  const second=resolveTurn(first,[],first.version).state;
  expect(second.cities[city.id]!.buildings?.market).toBe(1);
  expect(second.cities[city.id]!.construction).toBeUndefined();
});
it('enforces slots, levels, ownership, funds and a single queue',()=>{
  const s=setup(),c=s.cities.find(c=>c.owner==='agent-1')!;c.level=1;c.buildings={farm:1};
  expect(validateAction(s,'agent-1',order(c.id))).toEqual({ok:false,code:'BUILDING_SLOTS_FULL'});
  expect(validateAction(s,'agent-1',order(c.id,'farm')).ok).toBe(true);
  c.buildings={farm:3};expect(validateAction(s,'agent-1',order(c.id,'farm'))).toEqual({ok:false,code:'MAX_BUILDING_LEVEL'});
  c.buildings={};c.construction={building:'farm',level:1,completesTurn:2};
  expect(validateAction(s,'agent-1',order(c.id))).toEqual({ok:false,code:'CONSTRUCTION_BUSY'});
  expect(validateAction(s,'agent-1',{type:'develop',cityId:c.id})).toEqual({ok:false,code:'CONSTRUCTION_BUSY'});
  delete c.construction;s.resources['agent-1']=39;
  expect(validateAction(s,'agent-1',order(c.id))).toEqual({ok:false,code:'INSUFFICIENT_RESOURCES'});
  expect(validateAction(s,'agent-2',order(c.id))).toEqual({ok:false,code:'NOT_OWNER'});
  expect(validateAction(s,'agent-1',order(c.id,'invalid'))).toEqual({ok:false,code:'INVALID_BUILDING'});
});
it('ties farm yield to terrain and charges farm and market maintenance',()=>{
  const s=setup(),c=s.cities[0]!;c.terrain='plain';c.resourceTrait=null;c.troops=0;delete c.units;
  const base=fiscalEstimate([c]);c.buildings={farm:1,market:2};
  expect(fiscalEstimate([c]).revenue-base.revenue).toBe(10);
  expect(fiscalEstimate([c]).maintenance-base.maintenance).toBe(5);
  c.terrain='farmland';expect(fiscalEstimate([c]).revenue-base.revenue).toBe(12);
});
it('uses completed barracks discounts in both validation and actual recruitment',()=>{
  const s=setup(),c=s.cities.find(c=>c.owner==='agent-1')!;c.buildings={barracks:3};s.resources['agent-1']=10;
  const action:BattleAction={type:'recruit',cityId:c.id,unitType:'cavalry',amount:2};
  expect(validateAction(s,'agent-1',action).ok).toBe(true);
  const next=resolveTurn(s,[{agentId:'agent-1',action}],s.version);
  expect(next.events.some(e=>e.type==='recruit'&&e.agentId==='agent-1')).toBe(true);
  const held=resolveTurn(s,[],s.version);
  const expenses=(result:typeof next)=>result.events.filter(e=>e.type==='upkeep'&&e.agentId==='agent-1').reduce((sum,e)=>sum+(e.amount??0),0);
  expect(next.state.resources['agent-1']).toBe(held.state.resources['agent-1']!-10-(expenses(next)-expenses(held)));
});
it('finishes a conquered county project for its new owner exactly once',()=>{
  const s=setup(),c=s.cities.find(c=>c.owner==='agent-1')!;
  c.construction={building:'farm',level:2,completesTurn:2};c.owner='agent-2';s.turn=2;
  const events:unknown[]=[];settleConstruction(s,e=>events.push(e));settleConstruction(s,e=>events.push(e));
  expect(c.buildings?.farm).toBe(2);expect(c.construction).toBeUndefined();
  expect(events).toHaveLength(1);expect(events[0]).toMatchObject({agentId:'agent-2',cityId:c.id});
});
