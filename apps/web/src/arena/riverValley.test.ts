import {expect,it} from 'vitest';
import {riverValleyHeight,RIVER_VALLEY} from './riverValley';

it('gives riverside settlements a level floodplain instead of a narrow steep incision',()=>{
  for(const distance of [0,.02,.05,.08]){
    expect(riverValleyHeight(.5,distance)).toBeCloseTo(.025,8);
    expect(riverValleyHeight(.1,distance)).toBeCloseTo(.025,8);
  }
});
it('joins the floodplain to unchanged upland relief smoothly',()=>{
  expect(riverValleyHeight(.5,RIVER_VALLEY.upland)).toBe(.5);
  expect(riverValleyHeight(.7,100)).toBe(.7);
  for(const edge of [RIVER_VALLEY.floodplain,RIVER_VALLEY.upland]){
    expect(Math.abs(riverValleyHeight(.5,edge+.0001)-riverValleyHeight(.5,edge-.0001))).toBeLessThan(.000001);
  }
  const samples=Array.from({length:401},(_,i)=>riverValleyHeight(.5,i/1000));
  expect(samples.every((h,i)=>Number.isFinite(h)&&h>=.025&&h<=.5&&(i===0||h>=samples[i-1]!))).toBe(true);
});
