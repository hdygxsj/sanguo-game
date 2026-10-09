import type { TerrainField } from './terrainField';
import type { CityState } from '../types';
import {BufferGeometry,Float32BufferAttribute,Color} from 'three';
import {settlementWidths} from './settlementGrading';

export function createFoundationGeometry(){
  // Preserve the entire square support plane; only the exposed skirt flares
  // outward to meet the landscape. One shared geometry remains instanced.
  const rim=[[-.5,-.5],[0,-.5],[.5,-.5],[.5,0],[.5,.5],[0,.5],[-.5,.5],[-.5,0]];
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const topColor=new Color('#85816c'),soilColor=new Color('#727858');
  for(let level=0;level<2;level++)for(let i=0;i<8;i++){
    const p=rim[i]!,scale=level?1.28+.035*Math.sin(i*2.7):1;
    positions.push(p[0]!*scale,-level,p[1]!*scale);
    const color=level?soilColor:topColor;colors.push(color.r,color.g,color.b);
  }
  positions.push(0,0,0,0,-1,0);colors.push(topColor.r,topColor.g,topColor.b,soilColor.r,soilColor.g,soilColor.b);
  for(let i=0;i<8;i++){
    const j=(i+1)%8;
    indices.push(16,j,i,17,i+8,j+8,i,j,i+8,j,j+8,i+8);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  // Do not average upward top normals with side/buried bottom normals: a
  // thin, nonuniformly scaled skirt otherwise develops artificial black rims.
  const surface=geometry.toNonIndexed();geometry.dispose();
  surface.computeVertexNormals();surface.computeBoundingSphere();return surface;
}

export function buildingFoundation(field: TerrainField, x: number, z: number, width: number) {
  const {bounds,resolution,heights}=field;
  const startX=Math.max(0,Math.floor((x-width/2-bounds.x)/bounds.width*resolution));
  const endX=Math.min(resolution,Math.ceil((x+width/2-bounds.x)/bounds.width*resolution));
  const startZ=Math.max(0,Math.floor((z-width/2-bounds.z)/bounds.height*resolution));
  const endZ=Math.min(resolution,Math.ceil((z+width/2-bounds.z)/bounds.height*resolution));
  let bottom=field.height(x,z),top=bottom;
  // Clip the actual terrain triangles to the footprint. Taking whole-cell
  // extrema overestimates narrow sites, lifting them toward nearby ridges.
  type Point=[number,number,number]; // x, z, height
  const vertex=(i:number,j:number):Point=>[bounds.x+i/resolution*bounds.width,
    bounds.z+j/resolution*bounds.height,heights[j*(resolution+1)+i]!];
  const planes:[0|1,number,number][]=[[0,x-width/2,1],[0,x+width/2,-1],[1,z-width/2,1],[1,z+width/2,-1]];
  const include=(triangle:Point[])=>{
    let polygon=triangle;
    for(const [axis,edge,direction] of planes){
      const clipped:Point[]=[];
      for(let n=0;n<polygon.length;n++){
        const a=polygon[n]!,b=polygon[(n+1)%polygon.length]!;
        const insideA=(a[axis]-edge)*direction>=0,insideB=(b[axis]-edge)*direction>=0;
        if(insideA)clipped.push(a);
        if(insideA!==insideB){
          const t=(edge-a[axis])/(b[axis]-a[axis]);
          clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]);
        }
      }
      polygon=clipped;
    }
    for(const p of polygon){bottom=Math.min(bottom,p[2]);top=Math.max(top,p[2]);}
  };
  for(let j=startZ;j<endZ;j++)for(let i=startX;i<endX;i++){
    const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);
    include([a,b,c]);include([b,d,c]);
  }
  return {width,top:top+.001,bottom:bottom-.002};
}

export function createBuildingSites(field:TerrainField,cities:CityState[]){
  const widths=settlementWidths(cities);
  return new Map(cities.map(c=>{
    const width=widths.get(c.id)!;
    return [c.id,buildingFoundation(field,c.x,c.z,width)] as const;
  }));
}
