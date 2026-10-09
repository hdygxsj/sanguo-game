import {it,expect} from 'vitest';
import {marchingFormation} from './marchingFormation';
import type {ArmyState} from '../types';
it('keeps mixed units centred on the same displayed route position and facing its destination',()=>{
  const army:ArmyState={id:'march',owner:'a',troops:80,units:{spear:20,sword:20,archer:20,cavalry:20},route:[1,2],leg:0,progress:.25,speed:.7};
  const cities=[{id:1,x:0,z:0},{id:2,x:4,z:0}];
  const before=JSON.stringify(army),formation=marchingFormation(army,cities);
  expect(formation).toHaveLength(8);
  expect(formation.reduce((sum,p)=>sum+p.x,0)/8).toBeCloseTo(1);
  expect(formation.reduce((sum,p)=>sum+p.z,0)/8).toBeCloseTo(0);
  for(const p of formation){expect(p.rotation).toBeCloseTo(Math.PI/2);expect(p.destination).toBe(2);}
  for(const unit of ['spear','sword','archer','cavalry'])expect(formation.filter(p=>p.unit===unit)).toHaveLength(2);
  expect(JSON.stringify(army)).toBe(before);
  expect(marchingFormation({...army,route:[]},cities)).toEqual([]);
});
