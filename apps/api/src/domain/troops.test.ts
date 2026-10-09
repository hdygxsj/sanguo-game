import {expect,it} from 'vitest';
import {composition,detachTroops,mergeTroops,setTroops,troopMultiplier,troopUpkeep} from './troops.js';
import {generateBattle} from './generate.js';
import {validateAction} from './rules.js';
import {resolveTurn} from './resolveTurn.js';
it('splits, merges and loses mixed soldiers with exact integer conservation',()=>{
  const body={troops:11,units:{spear:3,sword:2,archer:3,cavalry:3}};
  const detached=detachTroops(body,5);expect(body.troops).toBe(6);
  expect(Object.values(detached).reduce((a,b)=>a+b,0)).toBe(5);
  mergeTroops(body,{troops:5,units:detached});expect(body.units).toEqual({spear:3,sword:2,archer:3,cavalry:3});
  setTroops(body,4);expect(Object.values(body.units).reduce((a,b)=>a+b,0)).toBe(4);
});
it('treats absent legacy composition as spears and differentiates wages and counters',()=>{
  expect(composition({troops:10})).toEqual({spear:10,sword:0,archer:0,cavalry:0});
  expect(troopUpkeep({troops:10,units:{cavalry:10}})).toBe(4);
  expect(troopMultiplier({troops:10},{troops:10,units:{cavalry:10}})).toBeGreaterThan(1);
  expect(troopMultiplier({troops:10,units:{cavalry:10}},{troops:10},true)).toBeLessThan(1);
});
it('enforces cavalry prices and preserves recruitment composition through settlement',()=>{
  const s=generateBattle('troops',7,5,2,0,false),city=s.cities.find(c=>c.owner==='agent-1')!;
  s.resources['agent-1']=6;const action={type:'recruit' as const,cityId:city.id,amount:1,unitType:'cavalry' as const};
  expect(validateAction(s,'agent-1',action).ok).toBe(false);s.resources['agent-1']=100;
  const next=resolveTurn(s,[{agentId:'agent-1',action}],0).state;
  expect(composition(next.cities[city.id]!).cavalry).toBe(1);expect(next.cities[city.id]!.troops).toBe(city.troops+1);
});
it('preserves mixed types in dispatch and increases cavalry movement',()=>{
  const s=generateBattle('troops',7,5,2,0,false),city=s.cities.find(c=>c.owner==='agent-1')!,target=s.cities[city.adjacent[0]!]!;
  target.terrain='plain';target.weather='clear';target.x=city.x+7;target.z=city.z;
  city.units={cavalry:20};city.troops=20;
  const result=resolveTurn(s,[{agentId:'agent-1',action:{type:'attack',fromCityId:city.id,toCityId:target.id,troops:10}}],0).state;
  expect(composition(result.armies![0]!).cavalry).toBe(10);expect(composition(result.cities[city.id]!).cavalry).toBe(10);
  expect(result.armies![0]!.progress).toBeCloseTo(.135);
});
it('resolves counters into surviving unit counts without converting cavalry into spears',()=>{
  const s=generateBattle('troops',7,5,2,0,false),source=s.cities.find(c=>c.owner==='agent-1')!,target=s.cities[source.adjacent[0]!]!;
  target.x=source.x+7;target.z=source.z;target.weather='clear';
  s.armies=[{id:'spears',owner:'agent-1',troops:20,units:{spear:20},route:[source.id,target.id],leg:0,progress:.5,speed:.7},
    {id:'cavalry',owner:'agent-2',troops:20,units:{cavalry:20},route:[source.id,target.id],leg:0,progress:.5,speed:.7}];
  const next=resolveTurn(s,[],0).state;
  expect(next.armies).toHaveLength(1);expect(next.armies![0]!.owner).toBe('agent-1');
  expect(composition(next.armies![0]!).spear).toBe(next.armies![0]!.troops);
  expect(composition(next.armies![0]!).cavalry).toBe(0);
});
it('preserves cavalry identity under unpaid desertion',()=>{
  const s=generateBattle('troops',7,5,2,0,false),city=s.cities.find(c=>c.owner==='agent-1')!;
  city.troops=15;city.units={cavalry:15};s.resources['agent-1']=0;
  const next=resolveTurn(s,[],0).state.cities[city.id]!;
  expect(next.troops).toBeLessThan(15);expect(composition(next).cavalry).toBe(next.troops);expect(composition(next).spear).toBe(0);
});
it('replaces defeated garrisons with surviving attacking composition',()=>{
  const s=generateBattle('troops',7,5,2,0,false),source=s.cities.find(c=>c.owner==='agent-1')!,target=s.cities[source.adjacent[0]!]!;
  source.troops=20;source.units={sword:20};target.terrain='plain';target.weather='clear';target.x=source.x+.1;target.z=source.z;target.troops=1;target.units={spear:1};target.owner=null;
  const next=resolveTurn(s,[{agentId:'agent-1',action:{type:'attack',fromCityId:source.id,toCityId:target.id,troops:10}}],0).state;
  expect(next.cities[target.id]!.owner).toBe('agent-1');expect(composition(next.cities[target.id]!).spear).toBe(0);
  expect(composition(next.cities[target.id]!).sword).toBe(next.cities[target.id]!.troops);
});
