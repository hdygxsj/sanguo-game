import { describe,it,expect } from 'vitest';
import { historicGeography } from '../../../api/src/domain/hanGeography';
import { compactGeography } from './compactMap';
import { createTerrainField } from './terrainField';

describe('shared landscape height field',()=>{
  it('does not excavate an artificial crater beneath a settlement',()=>{
    const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map);
    // An isolated inland settlement stays at its original center elevation.
    // Crowded sites deliberately blend their targets; river corridors deliberately
    // retain their original vertices, so neither promises exact center equality.
    const map={...geo.map,rivers:[]},landscape=createTerrainField(map,[],96);
    for(const city of geo.cities.filter((_,i)=>i%400===0)){
      const towns=createTerrainField(map,[city],96);
      expect(towns.height(city.x,city.z)).toBeCloseTo(landscape.height(city.x,city.z),6);
    }
  });
  it('has continuous mountain relief, a valid coast mask and identical town anchoring',()=>{
    const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map);
    const field=createTerrainField(geo.map,geo.cities,96);
    expect(Math.max(...field.heights)-Math.min(...field.heights)).toBeGreaterThan(.3);
    for(const c of geo.cities){
      expect(field.contains(c.x,c.z)).toBe(true);
      expect(Number.isFinite(field.height(c.x,c.z))).toBe(true);
      expect(Math.abs(field.height(c.x,c.z)-field.height(c.x+.001,c.z))).toBeLessThan(.03);
    }
    expect(field.contains(-100,-100)).toBe(false);
    const i=40,j=30,k=j*97+i,a=.25,b=.35;
    const triangleHeight=field.heights[k]!+(field.heights[k+1]!-field.heights[k]!)*a+(field.heights[k+97]!-field.heights[k]!)*b;
    expect(field.height(field.bounds.x+(i+a)/96*field.bounds.width,field.bounds.z+(j+b)/96*field.bounds.height)).toBeCloseTo(triangleHeight,8);
  });
});
