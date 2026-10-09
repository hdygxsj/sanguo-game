import { describe, expect, it } from 'vitest';
import { historicGeography } from '../../../api/src/domain/hanGeography';
import { compactGeography } from './compactMap';
import { buildTerritories, countyFill, mapResource, zoomView } from './territories';

describe('county territorial map',()=>{
  const source=historicGeography(()=>.5);
  const geography=compactGeography(source.cities,source.map);
  it('partitions the entire map extent into 1184 nonempty county cells with distinct commandery boundaries',()=>{
    const result=buildTerritories(geography.cities,geography.map.outline);
    expect(result.cells).toHaveLength(1184);
    let totalArea=0;
    for(const cell of result.cells){
      expect(cell.points.length).toBeGreaterThanOrEqual(3);
      const city=geography.cities[cell.id]!;
      let area=0;
      cell.points.forEach((a,i)=>{
        const b=cell.points[(i+1)%cell.points.length]!;
        area+=a[0]*b[1]-b[0]*a[1];
        expect((b[0]-a[0])*(city.z-a[1])-(b[1]-a[1])*(city.x-a[0])).toBeGreaterThanOrEqual(-1e-6);
      });
      totalArea+=area/2;
    }
    expect(totalArea).toBeCloseTo(result.bounds.width*result.bounds.height,5);
    expect(result.commanderyBorders.length).toBeGreaterThan(100);
  });
  it('fills neutral, occupied and captured counties using current ownership rather than cached state',()=>{
    const city=geography.cities[0]!;
    const colors=new Map([['a','#ba5441'],['b','#42796b']]);
    expect(countyFill({...city,owner:null},colors)).not.toBe('#ba5441');
    expect(countyFill({...city,owner:'a'},colors)).toBe('#ba5441');
    expect(countyFill({...city,owner:'b'},colors)).toBe('#42796b');
  });
  it('restores farmland, ore and northern horse landmarks without mutating saved resources',()=>{
    const city=geography.cities[0]!;
    expect(mapResource({...city,terrain:'farmland',resourceTrait:'granary'})).toBe('farm');
    expect(mapResource({...city,terrain:'mine',resourceTrait:'ore-vein'})).toBe('mine');
    expect(mapResource({...city,id:8,province:'涼州',terrain:'plain',resourceTrait:null})).toBe('horse');
    expect(mapResource({...city,id:8,province:'揚州',terrain:'plain',resourceTrait:null})).toBe(null);
  });
  it('clamps repeated zoom and retains the cursor anchor',()=>{
    const full={x:0,z:0,width:20,height:10};
    const next=zoomView(full,.5,[5,4],full);
    expect(next).toEqual({x:2.5,z:2,width:10,height:5});
    let view=full;
    for(let i=0;i<50;i++)view=zoomView(view,.5,[10,5],full);
    expect(view.width).toBeGreaterThanOrEqual(1.2);
    expect(zoomView(full,10,[10,5],full)).toEqual(full);
  });
});
