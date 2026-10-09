import type {CityState,HistoricalMap} from '../types.js';
import {settlementWidths} from './settlementGrading.js';

/** Display-only bank placement, shared by political and three-dimensional maps. */
export function riverCityLayout(cities:CityState[],map:HistoricalMap){
  const result=cities.map(c=>({...c}));
  const origins=new Map(cities.map(c=>[c.id,c]));
  const segments=map.rivers.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i]!,b})));
  const distance=(x:number,z:number)=>{
    let best=Infinity;
    for(const {a,b} of segments){
      const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
      best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
    }return best;
  };
  const contains=(x:number,z:number)=>{
    let inside=false;
    for(let i=0,j=map.outline.length-1;i<map.outline.length;j=i++){
      const a=map.outline[i]!,b=map.outline[j]!;
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  };
  // Moving one city can enlarge a neighbour's adaptive model footprint.
  // Recheck widths, keeping every search bounded around the original site.
  for(let pass=0;pass<8;pass++){
  const widths=settlementWidths(result.map(c=>({...c,level:3})));
  let changes=0;
  for(const city of [...result].sort((a,b)=>a.id-b.id)){
    const oldWidth=widths.get(city.id)!;
    if(distance(city.x,city.z)>oldWidth*.71+.045)continue;
    let placed=false;
    for(let step=1;step<=14&&!placed;step++)for(let angle=0;angle<32;angle++){
      const origin=origins.get(city.id)!,r=step*.025,t=angle*Math.PI/16,x=origin.x+Math.cos(t)*r,z=origin.z+Math.sin(t)*r;
      let nearest=.34;
      for(const other of result)if(other.id!==city.id&&Math.abs(x-other.x)<nearest&&Math.abs(z-other.z)<nearest)nearest=Math.min(nearest,Math.hypot(x-other.x,z-other.z));
      const width=Math.max(.024,nearest*.68)*(city.imperial?1.12:.99)*(city.seat?1:.9);
      const footprint=width*.71+.01;
      if(distance(x,z)<footprint+.04)continue;
      if(![[0,0],[-1,-1],[-1,1],[1,-1],[1,1]].every(([a,b])=>contains(x+a!*footprint,z+b!*footprint)))continue;
      if(result.some(other=>{
        if(other.id===city.id)return false;
        const reach=(width+widths.get(other.id)!)*.71+.01;
        return Math.abs(x-other.x)<reach&&Math.abs(z-other.z)<reach&&Math.hypot(x-other.x,z-other.z)<reach;
      }))continue;
      city.x=x;city.z=z;placed=true;changes++;break;
    }
  }
  if(!changes)break;
  }
  const byId=new Map(result.map(c=>[c.id,c]));
  return {cities:result,map:{...map,id:`${map.id}-bank-layout`,commanderies:map.commanderies.map(g=>{
    const seat=byId.get(g.seatId);return seat?{...g,point:[seat.x,seat.z] as [number,number]}:g;
  })}};
}
