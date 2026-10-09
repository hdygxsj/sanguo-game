import {it,expect,vi} from 'vitest';
import {historicGeography} from '../../../api/src/domain/hanGeography';
import {compactGeography} from './compactMap';
import {riverCityLayout} from './riverCityLayout';
import {settlementWidths} from './settlementGrading';
import type {HistoricalMap} from '../types';
const distance=(x:number,z:number,map:HistoricalMap)=>Math.min(...map.rivers.flatMap(r=>r.points.slice(1).map((b,i)=>{
  const a=r.points[i]!,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
})));
it('skips exact distance work for cities outside the capped footprint radius',()=>{
  const cities=historicGeography(()=>.5).cities.slice(0,100).map((c,i)=>({...c,x:i,z:0}));
  const hypot=vi.spyOn(Math,'hypot');
  try{
    const result=settlementWidths(cities);
    expect(result.size).toBe(100);
    expect(hypot.mock.calls.length).toBeLessThan(100);
  }finally{hypot.mockRestore();}
});
it('moves Puyang onto a safe bank while preserving simulation data and common map anchors',()=>{
  const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map),before=JSON.stringify(geo);
  const result=riverCityLayout(geo.cities,geo.map),city=result.cities.find(c=>c.name==='濮陽縣')!;
  const widths=settlementWidths(result.cities.map(c=>({...c,level:3})));
  const originalWidths=settlementWidths(geo.cities.map(c=>({...c,level:3})));
  const beforeCount=geo.cities.filter(c=>distance(c.x,c.z,geo.map)<originalWidths.get(c.id)!*.71+.04).length;
  const afterCount=result.cities.filter(c=>distance(c.x,c.z,result.map)<widths.get(c.id)!*.71+.04).length;
  console.info('river-bank overlap candidates', {before:beforeCount,after:afterCount});
  expect(afterCount).toBe(0);
  expect(distance(city.x,city.z,result.map)).toBeGreaterThan(widths.get(city.id)!*.71+.04);
  expect(JSON.stringify(geo)).toBe(before);
  for(const [i,c] of result.cities.entries()){
    const original=geo.cities[i]!;
    expect({...c,x:original.x,z:original.z}).toEqual(original);
    expect(Math.hypot(c.x-original.x,c.z-original.z)).toBeLessThanOrEqual(.351);
  }
  for(const group of result.map.commanderies){const seat=result.cities[group.seatId]!;expect(group.point).toEqual([seat.x,seat.z]);}
});
it('does not move cities again when levels, troops or ownership change',()=>{
  const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map);
  const a=riverCityLayout(geo.cities,geo.map),b=riverCityLayout(geo.cities.map(c=>({...c,level:4,troops:999,owner:'agent-2'})),geo.map);
  expect(a.cities.map(c=>[c.x,c.z])).toEqual(b.cities.map(c=>[c.x,c.z]));
});
it('keeps all display centres on land in both compact and geographic layouts',()=>{
  const raw=historicGeography(()=>.5);
  for(const geo of [raw,compactGeography(raw.cities,raw.map)]){
    const result=riverCityLayout(geo.cities,geo.map);
    for(const city of result.cities){
      let inside=false;const outline=result.map.outline;
      for(let i=0,j=outline.length-1;i<outline.length;j=i++){
        const a=outline[i]!,b=outline[j]!;
        if((a[1]>city.z)!==(b[1]>city.z)&&city.x<(b[0]-a[0])*(city.z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      expect(inside,city.name).toBe(true);
    }
    const widths=settlementWidths(result.cities.map(c=>({...c,level:3})));
    expect(result.cities.filter(c=>distance(c.x,c.z,result.map)<widths.get(c.id)!*.71+.04).map(c=>c.name)).toEqual([]);
  }
});
