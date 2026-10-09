import type { HistoricalMap,CityState } from '../types.js';
import { mapBounds } from './compactMap.js';
import {gradeSettlements,settlementWidths} from './settlementGrading.js';
import {riverValleyHeight} from './riverValley.js';
import {lineDistance} from './lineDistance.js';
export function createTerrainField(map:HistoricalMap,_cities:CityState[],resolution=384){
  const bounds=mapBounds(map.outline,0);
  const contains=(x:number,z:number)=>{
    let inside=false;
    for(let i=0,j=map.outline.length-1;i<map.outline.length;j=i++){
      const a=map.outline[i]!,b=map.outline[j]!;
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  };
  const ridgeDistance=lineDistance(map.ranges),riverDistance=lineDistance(map.rivers);
  let heights=new Float32Array((resolution+1)**2);
  for(let j=0;j<=resolution;j++)for(let i=0;i<=resolution;i++){
    const x=bounds.x+i/resolution*bounds.width,z=bounds.z+j/resolution*bounds.height;
    const ridge=ridgeDistance(x,z),river=riverDistance(x,z);
    let h=.035+.055*(1+Math.sin(x*1.7)*Math.cos(z*2.1))+.28*Math.exp(-ridge*ridge/.35)*(.85+.15*Math.sin(x*2+z*1.5)**2);
    h=riverValleyHeight(h,river);
    // Broad floodplains avoid placing a riverside town across a sharp incision.
    // Settlement grading below preserves this shared river corridor.
    heights[j*(resolution+1)+i]=h;
  }
  const height=(x:number,z:number)=>{
    const u=Math.max(0,Math.min(resolution-.00001,(x-bounds.x)/bounds.width*resolution)),v=Math.max(0,Math.min(resolution-.00001,(z-bounds.z)/bounds.height*resolution));
    const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*(resolution+1)+i;
    // Match PlaneGeometry's diagonal, not a bilinear surface above/below it.
    const h00=heights[k]!,h10=heights[k+1]!,h01=heights[k+resolution+1]!,h11=heights[k+resolution+2]!;
    return a+b<=1?h00+(h10-h00)*a+(h01-h00)*b:h11+(h01-h11)*(1-a)+(h10-h11)*(1-b);
  };
  const widths=settlementWidths(_cities.map(c=>({...c,level:c.seat?2:1})));
  const sites=_cities.map(c=>({x:c.x,z:c.z,width:widths.get(c.id)!,elevation:height(c.x,c.z)}));
  heights=gradeSettlements(heights,bounds,resolution,sites,riverDistance);
  return {bounds,resolution,heights,height,contains};
}
export type TerrainField=ReturnType<typeof createTerrainField>;
