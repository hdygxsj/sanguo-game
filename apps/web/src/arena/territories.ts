import type { CityState } from '../types';
import { mapBounds } from './compactMap';
export type Point=[number,number];
export type ViewBox={x:number;z:number;width:number;height:number};

// Voronoi cells are game territories, not reconstructed historical boundaries.
// Clip their rendered group to the coastline; the cells themselves exactly tile
// the extent, including sparse frontier regions, without gaps or overlapping land.
export function buildTerritories(cities:CityState[],outline:Point[]){
  const bounds=mapBounds(outline,0);
  const rectangle:Point[]=[[bounds.x,bounds.z],[bounds.x+bounds.width,bounds.z],[bounds.x+bounds.width,bounds.z+bounds.height],[bounds.x,bounds.z+bounds.height]];
  const cells=cities.map(city=>{
    let points=rectangle;
    for(const other of cities){
      if(other.id===city.id)continue;
      const nx=other.x-city.x,nz=other.z-city.z;
      const cut=(other.x*other.x+other.z*other.z-city.x*city.x-city.z*city.z)/2;
      const clipped:Point[]=[];
      for(let i=0;i<points.length;i++){
        const a=points[i]!,b=points[(i+1)%points.length]!;
        const da=a[0]*nx+a[1]*nz-cut,db=b[0]*nx+b[1]*nz-cut;
        if(da<=1e-10)clipped.push(a);
        if((da<0&&db>0)||(da>0&&db<0)){
          const t=da/(da-db);clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
        }
      }
      points=clipped;
    }
    return {id:city.id,points};
  });
  const edges=new Map<string,{group:number|undefined;points:Point[]}>();
  const commanderyBorders:Point[][]=[];
  const byId=new Map(cities.map(c=>[c.id,c]));
  for(const cell of cells)cell.points.forEach((a,i)=>{
    const b=cell.points[(i+1)%cell.points.length]!;
    const key=[a,b].map(p=>p.map(v=>v.toFixed(5)).join(',')).sort().join('|');
    const group=byId.get(cell.id)!.commanderyId,edge=edges.get(key);
    if(edge&&edge.group!==group)commanderyBorders.push([a,b]);
    else if(!edge)edges.set(key,{group,points:[a,b]});
  });
  return {cells,commanderyBorders,bounds};
}

export const NEUTRAL_COLOR='#c4bea0';
export function countyFill(city:CityState,colors:Map<string,string>){
  return city.owner ? colors.get(city.owner)??NEUTRAL_COLOR : NEUTRAL_COLOR;
}
export type MapResource='farm'|'mine'|'horse';
export const RESOURCE_LABELS:Record<MapResource,string>={farm:'农田',mine:'矿场',horse:'马场'};
export function mapResource(city:CityState):MapResource|null{
  if(city.siteKind)return city.siteKind==='city'?null:city.siteKind;
  if(city.resourceTrait==='horse-pasture')return 'horse';
  if(city.resourceTrait==='granary'||city.terrain==='farmland')return 'farm';
  if(city.resourceTrait==='ore-vein'||city.terrain==='mine')return 'mine';
  // Scenic horse-pasture landmarks for existing saves. This deliberately does
  // not change income, trained policy inputs, or claim a cavalry mechanic.
  if(city.terrain==='plain'&&/涼|凉|并|幽/.test(city.province??'')&&city.id%4===0)return 'horse';
  return null;
}

export function clampView(view:ViewBox,full:ViewBox):ViewBox{
  return {...view,x:Math.max(full.x,Math.min(full.x+full.width-view.width,view.x)),z:Math.max(full.z,Math.min(full.z+full.height-view.height,view.z))};
}
export function zoomView(view:ViewBox,factor:number,anchor:Point,full:ViewBox):ViewBox{
  const width=Math.min(full.width,Math.max(full.width*.06,view.width*factor));
  const ratio=width/view.width,height=view.height*ratio;
  return clampView({x:anchor[0]-(anchor[0]-view.x)*ratio,z:anchor[1]-(anchor[1]-view.z)*ratio,width,height},full);
}
