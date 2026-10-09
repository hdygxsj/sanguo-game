import { describe,it,expect } from 'vitest';
import { transitionAt, lodActive, nearestCounty, DEFAULT_MAP_TRANSITION } from './mapTransition';

describe('continuous political / terrain transition',()=>{
  it('changes the surface itself, not only model scale',()=>{
    const far=transitionAt(1),mid=transitionAt(3.5),near=transitionAt(9);
    expect(far.political).toBe(1);expect(far.relief).toBeLessThan(.1);expect(far.models).toBe(0);
    expect(mid.political).toBeGreaterThan(near.political);expect(mid.political).toBeLessThan(far.political);
    expect(mid.relief).toBeGreaterThan(far.relief);expect(mid.relief).toBeLessThan(near.relief);
    expect(near.models).toBe(1);expect(near.political).toBeLessThan(.1);expect(near.relief).toBe(1);
  });
  it('is continuous, reversible and has complementary icon/model handoff',()=>{
    for(let zoom=1;zoom<12;zoom+=.01){
      const a=transitionAt(zoom),b=transitionAt(zoom+.01);
      expect(a.icons+a.models).toBeCloseTo(1);
      for(const key of ['political','relief','models','icons','shadows'] as const)expect(Math.abs(a[key]-b[key])).toBeLessThan(.02);
      expect(transitionAt(zoom)).toEqual(a);
    }
    expect(DEFAULT_MAP_TRANSITION.models[0]).toBeGreaterThan(DEFAULT_MAP_TRANSITION.preload);
  });
  it('keeps LOD loaded across threshold noise and resolves the same county at every zoom',()=>{
    expect(lodActive(false,1.61,1.6,1.25)).toBe(true);
    expect(lodActive(true,1.59,1.6,1.25)).toBe(true);
    expect(lodActive(true,1.24,1.6,1.25)).toBe(false);
    const cities=[{id:10,x:0,z:0},{id:20,x:2,z:0}];
    expect(nearestCounty(cities,.1,.1)).toBe(10);
    expect(nearestCounty(cities,1.8,0)).toBe(20);
  });
});
