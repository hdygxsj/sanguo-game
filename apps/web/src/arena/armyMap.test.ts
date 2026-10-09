import { expect, it } from 'vitest';
import { armyMapPosition } from './armyMap';
import type { ArmyState } from '../types';

it('places marching flags between the displayed route endpoints, not original geography',()=>{
  const army:ArmyState={id:'test',owner:'a',troops:20,route:[1,2],leg:0,progress:.25,speed:.7};
  expect(armyMapPosition(army,[{id:1,x:10,z:20},{id:2,x:14,z:28}])).toEqual([11,22]);
  expect(armyMapPosition(army,[{id:1,x:0,z:0},{id:2,x:2,z:4}])).toEqual([.5,1]);
});

it('ignores invalid legacy route markers rather than crashing the map',()=>{
  expect(armyMapPosition({id:'bad',owner:'a',troops:1,route:[],leg:0,progress:0,speed:.7},[])).toBeNull();
});
