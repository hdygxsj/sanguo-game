import { it,expect } from 'vitest';
import { compactGeography } from './compactMap';
import { createTerrainField } from './terrainField';
import { createTerrainDetails,injectLandDetail,farmPoint } from './terrainDetail';
import * as details from './terrainDetail';
import {generateBattle} from '../../../api/src/domain/generate';
import {ShaderLib} from 'three';
it('adds slope-aware terrain colour and zoom-weighted surface relief to the standard shader',()=>{
  const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
  injectLandDetail(shader);
  expect(shader.fragmentShader).toContain('landSlope');
  expect(shader.fragmentShader).toContain('landMicroHeight');
  expect(shader.fragmentShader).toContain('normal = landDetailNormal(normal, -vViewPosition)');
  expect(shader.fragmentShader.indexOf('normal = landDetailNormal(normal, -vViewPosition)')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'));
  expect(shader.fragmentShader).toContain('detailWeight * landMicroHeight');
  expect(details.LAND_DETAIL_GLSL).not.toMatch(/\bpatch\b/);
  expect(shader.vertexShader).toContain('landSurfaceNormal=normal');
  expect(details.LAND_DETAIL_GLSL).toContain('normalize(landSurfaceNormal)');
});
it('relocates farm plots to nearby gentle ground and rejects cliffs or water',()=>{
  const city={id:7,x:0,z:0};
  const field={contains:()=>true,height:(x:number,_z:number)=>x<.05?(.05-x)*2:0};
  const anchor=details.chooseFarmAnchor(city,field,()=>false,[]);
  expect(anchor).not.toBeNull();
  for(let u=0;u<=1;u+=.2)for(let v=0;v<=1;v+=.2)expect(farmPoint(anchor!,u,v)[0]).toBeGreaterThan(.05);
  expect(details.chooseFarmAnchor(city,{...field,height:(x:number)=>x*2},()=>false,[])).toBeNull();
  expect(details.chooseFarmAnchor(city,field,()=>true,[])).toBeNull();
  expect(details.chooseFarmAnchor(city,field,()=>false,[])).toEqual(anchor);
  expect(city).toEqual({id:7,x:0,z:0});
});
it('joins river sections at bends without duplicate seams or shifting the centreline',()=>{
  const sections=details.riverSections([[0,0],[.1,0],[.1,0],[.1,.1]]);
  expect(sections[0]!.point).toEqual([0,0]);
  expect(sections.at(-1)!.point).toEqual([.1,.1]);
  const bends=sections.filter(s=>s.point[0]===.1&&s.point[1]===0);
  expect(bends).toHaveLength(1);
  expect(bends[0]!.normal[0]).toBeLessThan(0);
  expect(bends[0]!.normal[1]).toBeGreaterThan(0);
  expect(sections.every(s=>s.normal.every(Number.isFinite))).toBe(true);
  expect(details.riverSections([[0,0],[0,0]])).toEqual([]);
});
it('gives farmland deterministic curved boundaries and varied orientation without moving its county anchor',()=>{
  const city={id:7,x:2,z:3};
  const a=farmPoint(city,0,0),b=farmPoint(city,1,0),middle=farmPoint(city,.5,0);
  expect(farmPoint(city,0,0)).toEqual(a);
  expect(Math.hypot(middle[0]-(a[0]+b[0])/2,middle[1]-(a[1]+b[1])/2)).toBeGreaterThan(.0001);
  expect(farmPoint({...city,id:8},0,0)).not.toEqual(a);
  for(let u=0;u<=1;u+=.1)for(let v=0;v<=1;v+=.1){
    const p=farmPoint(city,u,v);expect(Math.hypot(p[0]-city.x,p[1]-city.z)).toBeLessThan(.16);
  }
});
it('replaces near atlas colour with continuous world-space detail before lighting',()=>{
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <opaque_fragment>'};injectLandDetail(shader);
  expect(shader.vertexShader).toContain('landPosition=position');expect(shader.fragmentShader).toContain('groundColour(),detailWeight');expect(shader.fragmentShader).toContain('fwidth');
});
it('builds draped river banks and farm rows with finite normals at the terrain height',()=>{
  const raw=generateBattle('farm-placement',7,5,16),geo=compactGeography(raw.cities,raw.map!),field=createTerrainField(geo.map,geo.cities);
  const g=createTerrainDetails(geo,field),p=g.attributes.position!,n=g.attributes.normal!;
  const rivers=createTerrainDetails({...geo,cities:[]},field);
  // The 300-site map deliberately has fewer farms than the legacy register.
  expect(p.count-rivers.attributes.position!.count).toBeGreaterThan(20*504);
  rivers.dispose();
  expect(p.count).toBeGreaterThan(1000);expect(p.count%3).toBe(0);
  for(let i=0;i<p.count;i+=97){expect(Number.isFinite(n.getY(i))).toBe(true);expect(p.getY(i)-field.height(p.getX(i),p.getZ(i))).toBeGreaterThan(.005);expect(p.getY(i)-field.height(p.getX(i),p.getZ(i))).toBeLessThan(.016);}
  g.dispose();
});
