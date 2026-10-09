import {PlaneGeometry} from 'three';
import type {TerrainField} from './terrainField';
// Swap only while relief is still flat; every 3D transition uses the full mesh.
export const surfaceUsesOverview=(zoom:number)=>zoom<=1.3;
export function createTerrainSurface(field:TerrainField,overview:boolean){
 const resolution=overview?Math.min(96,field.resolution):field.resolution;
 const g=new PlaneGeometry(field.bounds.width,field.bounds.height,resolution,resolution);
 g.rotateX(-Math.PI/2);
 const p=g.attributes.position!;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)+field.bounds.center[0],z=p.getZ(i)+field.bounds.center[1];
  p.setXYZ(i,x,field.height(x,z),z);
 }
 g.computeVertexNormals();return g;
}
