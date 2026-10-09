import {expect,it} from 'vitest';
import {gradeSettlements} from './settlementGrading';
const bounds={x:0,z:0,width:1,height:1},resolution=100;
const heights=Float32Array.from({length:101*101},(_,i)=>(i%101)/100*.2+.1);
const site={x:.5,z:.5,width:.12,elevation:.2};
it('levels the footprint at its original elevation and blends back without mutating source',()=>{
  const next=gradeSettlements(heights,bounds,resolution,[site],()=>100);
  expect(next[50*101+45]).toBeCloseTo(.2,6);
  expect(next[50*101+55]).toBeCloseTo(.2,6);
  expect(next[50*101+10]).toBe(heights[50*101+10]);
  expect(heights[50*101+45]).toBeCloseTo(.19,6);
  expect(Math.max(...Array.from(next).map((h,i)=>Math.abs(h-heights[i]!)))).toBeLessThan(.04);
});
it('preserves river corridor and is independent of settlement order',()=>{
  const sites=[site,{...site,x:.55,elevation:.21}];
  const river=(x:number,_z:number)=>Math.abs(x-.5);
  const next=gradeSettlements(heights,bounds,resolution,sites,river);
  expect(next[50*101+50]).toBe(heights[50*101+50]);
  expect(next).toEqual(gradeSettlements(heights,bounds,resolution,[...sites].reverse(),river));
});
it('does not tilt a town foundation with a neighbouring town’s outer earthworks',()=>{
  const neighbour={...site,x:.67,elevation:.234};
  const next=gradeSettlements(heights,bounds,resolution,[site,neighbour],()=>100);
  for(let i=45;i<=55;i++)expect(next[50*101+i]).toBeCloseTo(.2,6);
});
it('gives overlapping support footprints a shared terrace instead of contradictory heights',()=>{
  const sites=[site,{...site,x:.6,elevation:.22}];
  const next=gradeSettlements(heights,bounds,resolution,sites,()=>100);
  for(let i=44;i<=66;i++)expect(next[50*101+i]).toBeCloseTo(.21,6);
  expect(next).toEqual(gradeSettlements(heights,bounds,resolution,[...sites].reverse(),()=>100));
  expect(next[50*101+10]).toBe(heights[50*101+10]);
});
