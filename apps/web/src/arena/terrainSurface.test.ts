import {expect,it} from 'vitest';
import {createTerrainSurface,surfaceUsesOverview} from './terrainSurface';
import type {TerrainField} from './terrainField';
it('uses sixteen times fewer terrain triangles in overview without reducing close terrain detail',()=>{
 const field={bounds:{width:8,height:6,center:[2,3]},resolution:384,height:(x:number,z:number)=>x*.02+z*.03} as TerrainField;
 const overview=createTerrainSurface(field,true),detail=createTerrainSurface(field,false);
 expect(overview.index!.count/3).toBe(18432);
 expect(detail.index!.count/3).toBe(294912);
 for(const geometry of [overview,detail]){
  const p=geometry.getAttribute('position');
  expect(p.getY(0)).toBeCloseTo(field.height(p.getX(0),p.getZ(0)),5);
  expect(geometry.getAttribute('normal').count).toBe(p.count);
  geometry.dispose();
 }
 expect(surfaceUsesOverview(1)).toBe(true);
 expect(surfaceUsesOverview(1.31)).toBe(false);
 expect(surfaceUsesOverview(7)).toBe(false);
});
