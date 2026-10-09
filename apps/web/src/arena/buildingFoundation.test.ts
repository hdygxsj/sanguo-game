import {expect,it} from 'vitest';
import * as foundation from './buildingFoundation';
import {createTerrainField} from './terrainField';
import {historicGeography} from '../../../api/src/domain/hanGeography';
import {compactGeography} from './compactMap';


it('does not raise a small site to terrain vertices outside its footprint',()=>{
  const field={bounds:{x:0,z:0,width:1,height:1,center:[.5,.5] as [number,number]},resolution:1,
    heights:new Float32Array([0,1,0,1]),height:(x:number,_z:number)=>x,contains:()=>true};
  const site=foundation.buildingFoundation(field,.5,.5,.1);
  expect(site.top).toBeCloseTo(.551,6);
  expect(site.bottom).toBeCloseTo(.448,6);
});

it('uses a full supporting top and wider sloping foot instead of vertical block sides',()=>{
  const geometry=foundation.createFoundationGeometry(),positions=geometry.getAttribute('position');
  const top:number[][]=[],bottom:number[][]=[];
  for(let i=0;i<positions.count;i++)(positions.getY(i)===0?top:bottom).push([positions.getX(i),positions.getY(i),positions.getZ(i)]);
  expect(top.some(p=>p[0]===.5&&p[2]===.5)).toBe(true);
  expect(top.some(p=>p[0]===-.5&&p[2]===-.5)).toBe(true);
  expect(bottom.every(p=>p[1]===-1)).toBe(true);
  expect(Math.max(...bottom.map(p=>Math.abs(p[0]!)))).toBeGreaterThan(.6);
  expect(geometry.getAttribute('color').count).toBe(positions.count);
  expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
  geometry.dispose();
});

it('keeps top lighting independent from the buried bottom of the skirt',()=>{
  const geometry=foundation.createFoundationGeometry();
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
  const indices=geometry.index;
  for(let i=0;i<(indices?.count??positions.count);i+=3){
    const ids=[0,1,2].map(n=>indices?indices.getX(i+n):i+n);
    if(ids.every(id=>positions.getY(id)===0))for(const id of ids){
      expect(normals.getY(id)).toBeCloseTo(1,6);
      expect(normals.getX(id)).toBeCloseTo(0,6);
      expect(normals.getZ(id)).toBeCloseTo(0,6);
    }
  }
  geometry.dispose();
});

it('supports every corner and interior terrain triangle of a city footprint',()=>{
  expect(foundation.buildingFoundation).toBeTypeOf('function');
  const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map);
  const field=createTerrainField(geo.map,geo.cities,96);
  for(const city of geo.cities.filter((_,i)=>i%15===0)){
    const width=.08,site=foundation.buildingFoundation(field,city.x,city.z,width);
    expect(site.top).toBeGreaterThan(site.bottom);
    for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
      const height=field.height(city.x+(i/8-.5)*width,city.z+(j/8-.5)*width);
      expect(site.top).toBeGreaterThan(height);
      expect(site.bottom).toBeLessThan(height);
    }
  }
});

it('keeps riverside foundations shallow on the full compact county map',()=>{
  const raw=historicGeography(()=>.5),geo=compactGeography(raw.cities,raw.map);
  const field=createTerrainField(geo.map,geo.cities),sites=foundation.createBuildingSites(field,geo.cities);
  const xiling=geo.cities.find(c=>c.name==='西陵縣')!;
  const support=sites.get(xiling.id)!;
  expect((support.top-support.bottom)/support.width).toBeLessThan(.08);
  // Broad integration guard, not a claim that the remaining highland sites
  // already meet the final art target. Former narrow valleys produced 139.
  expect([...sites.values()].filter(s=>(s.top-s.bottom)/s.width>.3).length).toBeLessThan(10);
  const gaoyao=sites.get(geo.cities.find(c=>c.name==='高要縣')!.id)!;
  expect((gaoyao.top-gaoyao.bottom)/gaoyao.width).toBeLessThan(.12);
});
