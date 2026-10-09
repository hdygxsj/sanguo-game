import {expect,it} from 'vitest';
import {fiscalEstimate} from './economy.js';
import type {CityState} from './types.js';
const cities=(n:number):CityState[]=>Array.from({length:n},(_,id)=>({id,name:String(id),x:id,z:0,adjacent:[],owner:'a',troops:6,level:1,terrain:'plain',weather:'clear',resourceTrait:null,imperial:false,defenseMultiplier:1.12}));
it('keeps small-state tax unchanged and exposes the accounting identity',()=>{
  const budget=fiscalEstimate(cities(16));
  expect(budget.grossRevenue).toBe(35);expect(budget.administrationLoss).toBe(0);
  expect(budget.revenue).toBe(budget.grossRevenue-budget.administrationLoss);
  expect(budget.net).toBe(budget.revenue-budget.maintenance-budget.wages);
});
it('charges growing governing loss for large domains without negative tax',()=>{
  const medium=fiscalEstimate(cities(80)),large=fiscalEstimate(cities(1184));
  expect(medium.administrationLoss).toBe(Math.floor((163-80)*.75*64/104));
  expect(large.administrationLoss/large.grossRevenue).toBeGreaterThan(medium.administrationLoss/medium.grossRevenue);
  expect(large.revenue).toBeGreaterThan(0);expect(large.administrationLoss).toBeLessThan(large.grossRevenue*.75);
});
it('keeps a civilian realm viable at full map scale while large armies still cause deficits',()=>{
  const counties=cities(1184).map(c=>({...c,troops:0}));
  const empty=fiscalEstimate(counties);
  expect(empty.net).toBeGreaterThan(0);
  const built=counties.map(c=>({...c,buildings:{market:3,farm:3}}));
  expect(fiscalEstimate(built).net).toBeGreaterThan(empty.net);
  expect(fiscalEstimate(built.map(c=>({...c,troops:100,units:{cavalry:100}}))).net).toBeLessThan(0);
});
it('lets completed buildings increase net tax even after governing losses',()=>{
  const counties=cities(80),before=fiscalEstimate(counties);counties[0]!.buildings={market:3};
  const after=fiscalEstimate(counties);expect(after.net).toBeGreaterThan(before.net);
  expect(after.administrationLoss).toBeGreaterThan(before.administrationLoss);
  expect(fiscalEstimate([])).toMatchObject({grossRevenue:0,administrationLoss:0,revenue:0,net:0});
});
