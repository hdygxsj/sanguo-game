import type { CityState, HistoricalMap } from '../types.js';
import {naturalOutline} from './naturalOutline.js';

type Point = [number, number];
const STEP = .5;
export const COMPACT_LAYOUT={emptyScale:.045,densityScale:.83,densityExponent:1.35};
export const compactBandScale=(count:number)=>COMPACT_LAYOUT.emptyScale+COMPACT_LAYOUT.densityScale*Math.min(1,Math.max(0,count)/120)**COMPACT_LAYOUT.densityExponent;

// Strictly increasing cartogram axes: empty frontier bands shrink most, while
// dense central counties retain more room. No gameplay coordinates are mutated.
function compactAxis(values: number[], extent: number[],densityWeight=1) {
  const start = Math.floor(Math.min(...extent, ...values) / STEP) * STEP - STEP;
  const end = Math.ceil(Math.max(...extent, ...values) / STEP) * STEP + STEP;
  const edges = Array.from({length: Math.round((end-start)/STEP)+1}, (_,i)=>start+i*STEP);
  const totals = [0];
  const scales = edges.slice(0,-1).map((edge,i)=>{
    const count = values.filter(v=>Math.abs(v-(edge+STEP/2)) < 1).length;
    const scale = compactBandScale(count*densityWeight);
    totals.push(totals[i]! + STEP*scale);
    return scale;
  });
  const center = totals.at(-1)!/2;
  return {
    edges,
    project(value: number) {
      const i=Math.max(0,Math.min(scales.length-1,Math.floor((value-start)/STEP)));
      return totals[i]! + (value-edges[i]!)*scales[i]! - center;
    },
  };
}

export function compactGeography(cities: CityState[], map: HistoricalMap) {
  const allPoints=[...map.outline,...map.rivers.flatMap(r=>r.points),...map.ranges.flatMap(r=>r.points),...map.regions.map(r=>r.point)];
  // A representative site stands for several removed counties. Without this
  // normalization the new map collapses below the fixed road/river widths.
  const densityWeight=map.id.includes('campaign-300')?1184/300:1;
  const x=compactAxis(cities.map(c=>c.x),allPoints.map(p=>p[0]),densityWeight);
  const z=compactAxis(cities.map(c=>c.z),allPoints.map(p=>p[1]),densityWeight);
  const point=([px,pz]:Point):Point=>[x.project(px),z.project(pz)];
  // Split at every piecewise-linear break. Coastlines, rivers and points then
  // share exactly the same warp, including at coastal counties.
  const line=(points:Point[])=>points.flatMap((a,i)=>{
    const b=points[i+1];
    if(!b)return [point(a)];
    const cuts=[0];
    for(const [axis,edges] of [[0,x.edges],[1,z.edges]] as const) {
      if(a[axis]===b[axis])continue;
      for(const edge of edges){const t=(edge-a[axis])/(b[axis]-a[axis]);if(t>0&&t<1)cuts.push(t);}
    }
    return [...new Set(cuts)].sort((a,b)=>a-b).map(t=>point([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]));
  });
  return {
    cities:cities.map(c=>({...c,x:x.project(c.x),z:z.project(c.z)})),
    map:{...map,id:`${map.id}-compact`,outline:naturalOutline(line(map.outline)),
      rivers:map.rivers.map(r=>({...r,points:line(r.points)})),
      ranges:map.ranges.map(r=>({...r,points:line(r.points)})),
      regions:map.regions.map(r=>({...r,point:point(r.point)})),
      commanderies:map.commanderies.map(r=>({...r,point:point(r.point)})),
    },
  };
}

export function mapBounds(points: Point[], padding = 1) {
  const minX=Math.min(...points.map(p=>p[0]))-padding, maxX=Math.max(...points.map(p=>p[0]))+padding;
  const minZ=Math.min(...points.map(p=>p[1]))-padding, maxZ=Math.max(...points.map(p=>p[1]))+padding;
  return {x:minX,z:minZ,width:maxX-minX,height:maxZ-minZ,center:[(minX+maxX)/2,(minZ+maxZ)/2] as Point};
}
