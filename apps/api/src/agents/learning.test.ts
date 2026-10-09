import {expect,it} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import {features,newPolicy,value,upgradePolicy,candidates,utility} from './learning.js';
import {advanceArmies} from '../domain/marching.js';
import {UNIT_TYPES} from '../domain/troops.js';
it('includes treasury expenditure for generic city upgrades, not just named buildings',()=>{
  const state=generateBattle('upgrade-cost-feature',7,5,2,0),agent=state.agents[0]!;
  const city=state.cities.find(c=>c.owner===agent.id)!;city.level=2;state.resources[agent.id]=100;
  expect(features(state,agent,{type:'develop',cityId:city.id})[16]).toBeCloseTo(.4);
  state.resources[agent.id]=40;
  expect(features(state,agent,{type:'develop',cityId:city.id})[16]).toBe(1);
});

it('scores siege advantage using actual unit counters and commander bonuses without mutating troops',()=>{
  const s=generateBattle('siege-features',7,5,2,0),a=s.agents[0]!;
  const source=s.cities.find(c=>c.owner===a.id)!,target=s.cities[source.adjacent[0]!]!;
  target.owner=s.agents[1]!.id;target.troops=20;target.units={spear:20};target.defenseMultiplier=1.12;target.weather='clear';
  source.troops=30;source.units={sword:30};
  const action={type:'attack' as const,fromCityId:source.id,toCityId:target.id,troops:20};
  const sword=features(s,a,action);
  source.units={cavalry:30};const cavalry=features(s,a,action);
  expect(sword[8]).toBe(1);expect(cavalry[8]).toBe(0);
  expect(sword[7]).toBeGreaterThan(cavalry[7]!);
  source.units={spear:30};const without=features(s,a,action);
  const commander=s.characters!.find(p=>p.owner===a.id)!;commander.command=100;
  const withLeader=features(s,a,{...action,commanderId:commander.id});
  expect(without[8]).toBe(0);expect(withLeader[8]).toBe(1);
  expect(withLeader[7]).toBeCloseTo((24-22.4)/20);
  expect(source.troops).toBe(30);expect(source.units).toEqual({spear:30});
});
it('matches actual siege winners across every unit matchup and weather condition',()=>{
  const base=generateBattle('siege-agreement',7,5,2,0),agent=base.agents[0]!;
  const sourceId=base.cities.find(c=>c.owner===agent.id)!.id,targetId=base.cities[sourceId]!.adjacent[0]!;
  for(const attacker of UNIT_TYPES)for(const defender of UNIT_TYPES)for(const weather of ['clear','rain','snow','fog','blizzard'] as const){
    const s=structuredClone(base),source=s.cities[sourceId]!,target=s.cities[targetId]!;
    source.troops=30;source.units={[attacker]:30};target.owner=s.agents[1]!.id;
    target.troops=20;target.units={[defender]:20};target.weather=weather;target.defenseMultiplier=1.12;
    const commanderId=s.characters!.find(p=>p.owner===agent.id)!.id;
    const predicted=features(s,agent,{type:'attack',fromCityId:sourceId,toCityId:targetId,troops:20,commanderId})[8];
    s.armies=[{id:'agreement',owner:agent.id,troops:20,units:{[attacker]:20},route:[sourceId,targetId],leg:0,progress:1,speed:.7,commanderId}];
    advanceArmies(s,()=>{});
    expect(predicted,`${attacker}/${defender}/${weather}`).toBe(Number(target.owner===agent.id));
  }
});

it('offers legal construction choices and distinguishes their cost in policy features',()=>{
  const state=generateBattle('building-ai',7,5,2,0),agent=state.agents[0]!;
  state.resources[agent.id]=200;
  const options=candidates(state,agent);
  expect(options.some(a=>a.type==='develop'&&a.building==='market')).toBe(true);
  const city=state.cities.find(c=>c.owner===agent.id)!;
  const market=features(state,agent,{type:'develop',cityId:city.id,building:'market'});
  const barracks=features(state,agent,{type:'develop',cityId:city.id,building:'barracks'});
  expect(market).not.toEqual(barracks);
});

it('distinguishes equal-sized recruitment by type, cost, upkeep and mobility',()=>{
  const state=generateBattle('composition-features',7,5,4,0),agent=state.agents[0]!;
  const city=state.cities.find(c=>c.owner===agent.id)!;
  const spear=features(state,agent,{type:'recruit',cityId:city.id,amount:6,unitType:'spear'});
  const cavalry=features(state,agent,{type:'recruit',cityId:city.id,amount:6,unitType:'cavalry'});
  expect(spear).not.toEqual(cavalry);
  expect(cavalry[16]).toBeGreaterThan(spear[16]!);
  expect(cavalry[17]).toBeGreaterThan(spear[17]!);
  expect(cavalry[18]).toBeGreaterThan(spear[18]!);
});
it('keeps troop-count features bounded when funding a large army',()=>{
  const s=generateBattle('mobilization-features',7,5,2,0),a=s.agents[0]!,city=s.cities.find(c=>c.owner===a.id)!;
  const f=features(s,a,{type:'recruit',cityId:city.id,amount:140,unitType:'spear'});
  expect(f[2]).toBe(1);
  expect(f.every(Number.isFinite)).toBe(true);
});

it('scores legacy policies using only their original features',()=>{
  const policy={...newPolicy(),version:1,weights:Array(12).fill(1)};
  expect(value(policy,Array(19).fill(2))).toBe(24);
});

it('upgrades a checkpoint without changing its weights or mutating the original',()=>{
  const old={...newPolicy(),version:1,weights:Array(12).fill(.25),episodes:500};
  const next=upgradePolicy(old);
  expect(next.version).toBe(4);
  expect(next.weights).toHaveLength(23);
  expect(next.weights.slice(0,12)).toEqual(old.weights);
  expect(next.weights.slice(12)).toEqual(Array(11).fill(0));
  expect(old.weights).toHaveLength(12);
});

it('represents net investment yield and payback instead of treating all buildings alike',()=>{
  const state=generateBattle('investment-features',7,5,2,0),agent=state.agents[0]!;
  const city=state.cities.find(c=>c.owner===agent.id)!;city.terrain='farmland';
  const farm=features(state,agent,{type:'develop',cityId:city.id,building:'farm'});
  const market=features(state,agent,{type:'develop',cityId:city.id,building:'market'});
  const barracks=features(state,agent,{type:'develop',cityId:city.id,building:'barracks'});
  expect(farm[19]).toBeGreaterThan(market[19]!);
  expect(market[19]).toBeGreaterThan(0);expect(barracks[19]).toBeLessThan(0);
  expect(farm[20]).toBeGreaterThan(market[20]!);
});
it('credits productive completed buildings in state value but not an unfinished job',()=>{
  const state=generateBattle('investment-value',7,5,2,0),agent=state.agents[0]!;
  const city=state.cities.find(c=>c.owner===agent.id)!,before=utility(state,agent.id);
  city.construction={building:'market',level:1,completesTurn:2};
  expect(utility(state,agent.id)).toBe(before);
  delete city.construction;city.buildings={market:1};
  expect(utility(state,agent.id)).toBeGreaterThan(before);
});
it('zero-pads version-two policies without changing their action scores',()=>{
  const old={...newPolicy(),version:2,weights:Array(19).fill(.25)},next=upgradePolicy(old);
  expect(next.weights).toHaveLength(23);expect(next.weights.slice(19)).toEqual([0,0,0,0]);
  expect(value(next,Array(21).fill(2))).toBe(value(old,Array(21).fill(2)));
});
it('distinguishes rear logistics by transported strength and actual travel duration',()=>{
  const s=generateBattle('logistics-features',7,5,2,0),a=s.agents[0]!;
  const source=s.cities.find(c=>c.owner===a.id)!;
  const target=s.cities[source.adjacent[0]!]!;target.owner=a.id;
  source.troops=50;source.units={spear:50};source.x=0;source.z=0;target.x=1;target.z=0;target.weather='clear';
  const small=features(s,a,{type:'move',fromCityId:source.id,toCityId:target.id,troops:5});
  const large=features(s,a,{type:'move',fromCityId:source.id,toCityId:target.id,troops:40});
  expect(large[21]).toBeGreaterThan(small[21]!);
  expect(large[22]).toBeGreaterThan(0);
  target.x=10;
  const distant=features(s,a,{type:'move',fromCityId:source.id,toCityId:target.id,troops:40});
  expect(distant[21]).toBe(large[21]);expect(distant[22]).toBeLessThan(large[22]!);
  expect(distant.every(Number.isFinite)).toBe(true);
});
it('preserves version-three scores when enabling learnable logistics features',()=>{
  const old={...newPolicy(),version:3,weights:Array(21).fill(.25)},next=upgradePolicy(old);
  expect(next.weights.slice(21)).toEqual([0,0]);
  expect(value(next,Array(23).fill(2))).toBe(value(old,Array(23).fill(2)));
});
it('does not reward splitting or penalize merging the same surviving troops',()=>{
  const s=generateBattle('force-value',7,5,2,0),a=s.agents[0]!;
  const city=s.cities.find(c=>c.owner===a.id)!;
  city.troops=120;city.units={spear:120};s.armies=[];
  const consolidated=utility(s,a.id);
  city.troops=60;city.units={spear:60};
  s.armies.push({id:'supply',owner:a.id,troops:60,units:{spear:60},route:[city.id,city.adjacent[0]!],leg:0,progress:.5,speed:.7});
  expect(utility(s,a.id)).toBeCloseTo(consolidated,10);
  s.armies[0]!.troops=40;s.armies[0]!.units={spear:40};
  expect(utility(s,a.id)).toBeCloseTo(consolidated-20*.008,10);
});
