import { describe, expect, it } from 'vitest';
import { historicGeography } from '../../../api/src/domain/hanGeography';
import { compactGeography,mapBounds,compactBandScale } from './compactMap';

describe('compact strategic geography', () => {
  const original = historicGeography(() => .5);
  it('removes at least 25% of the previous compact footprint without uniformly shrinking dense counties',()=>{
    const result=compactGeography(original.cities,original.map),bounds=mapBounds(result.map.outline,0);
    // Previous compact map measured 18.32 × 18.03 world units.
    expect(bounds.width*bounds.height).toBeLessThan(18.32*18.03*.75);
    expect(compactBandScale(120)/.9).toBeGreaterThan(.95);
    expect(compactBandScale(0)/.16).toBeLessThan(.3);
    expect(new Set(result.cities.map(c=>`${c.x},${c.z}`)).size).toBe(original.cities.length);
  });
  it('shortens long commandery links by at least 30% without removing any county', () => {
    const result = compactGeography(original.cities, original.map);
    expect(result.cities).toHaveLength(1184);
    const lengths = (cities: typeof original.cities) => cities.flatMap(a => a.adjacent
      .filter(id => id > a.id && cities[id]!.commanderyId !== a.commanderyId)
      .map(id => Math.hypot(a.x - cities[id]!.x, a.z - cities[id]!.z))).sort((a,b)=>b-a);
    expect(lengths(result.cities)[0]!).toBeLessThan(lengths(original.cities)[0]! * .7);
  });
  it('preserves identity, roads, simulation values and geographic ordering', () => {
    const before = JSON.stringify(original);
    const result = compactGeography(original.cities, original.map);
    expect(JSON.stringify(original)).toBe(before);
    expect(result.map.commanderies).toHaveLength(105);
    expect(new Set(result.cities.map(c=>`${c.x},${c.z}`)).size).toBe(1184);
    for (const [i, city] of result.cities.entries()) {
      const source = original.cities[i]!;
      expect({...city,x:source.x,z:source.z}).toEqual(source);
      for (const id of source.adjacent) {
        expect(Math.sign(city.x-result.cities[id]!.x)).toBe(Math.sign(source.x-original.cities[id]!.x));
        expect(Math.sign(city.z-result.cities[id]!.z)).toBe(Math.sign(source.z-original.cities[id]!.z));
      }
    }
  });
  it('warps terrain and county points together, keeping every county on land', () => {
    const result = compactGeography(original.cities, original.map);
    const polygon = result.map.outline;
    for (const city of result.cities) {
      let inside = false;
      for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
        const a=polygon[i]!,b=polygon[j]!;
        if ((a[1]>city.z)!==(b[1]>city.z) && city.x<(b[0]-a[0])*(city.z-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
      }
      expect(inside, city.name).toBe(true);
    }
    for(const group of result.map.commanderies) {
      const seat=result.cities[group.seatId]!;
      expect(group.point).toEqual([seat.x,seat.z]);
    }
  });
});
