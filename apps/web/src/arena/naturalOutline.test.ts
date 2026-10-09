import {it,expect} from 'vitest';
import {naturalOutline} from '../../../api/src/domain/terrain/naturalOutline';
it('breaks long straight cuts into deterministic outward shoreline without mutating input',()=>{
  const input:[number,number][]=[[0,0],[4,0],[8,0],[8,8],[0,8],[0,0]],before=JSON.stringify(input);
  const result=naturalOutline(input);
  expect(JSON.stringify(input)).toBe(before);expect(result).toEqual(naturalOutline(input));
  expect(result.length).toBeGreaterThan(100);
  expect(Math.min(...result.map(p=>p[1]))).toBeLessThan(-.05);
  for(let i=0;i<result.length;i++)expect(Math.hypot(result[i]![0]-result[(i+1)%result.length]![0],result[i]![1]-result[(i+1)%result.length]![1])).toBeLessThan(.2);
  expect(result.every(([x,z])=>Number.isFinite(x)&&Number.isFinite(z))).toBe(true);
});
it('supports either winding and ignores duplicate vertices',()=>{
  const outline:[number,number][]=[[0,0],[4,0],[4,0],[4,4],[0,4]];
  for(const p of [outline,[...outline].reverse()]){
    const r=naturalOutline(p);expect(Math.min(...r.map(p=>p[0]))).toBeLessThan(0);expect(Math.max(...r.map(p=>p[0]))).toBeGreaterThan(4);
  }
});
