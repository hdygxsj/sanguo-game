import type {CityState} from '../types.js';

export function settlementWidths(cities:CityState[]){
  return new Map(cities.map(c=>{
    let distance=.34;
    for(const other of cities)if(c.id!==other.id&&Math.abs(c.x-other.x)<distance&&Math.abs(c.z-other.z)<distance)distance=Math.min(distance,Math.hypot(c.x-other.x,c.z-other.z));
    return [c.id,Math.max(.024,distance*.68)*(c.imperial?1.12:.72+.09*Math.min(3,c.level))*(c.seat?1:.9)] as const;
  }));
}
type Site={x:number;z:number;width:number;elevation:number};
const smooth=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
function sharedTerraces(sites:Site[],padding:number){
  const ordered=[...sites].sort((a,b)=>a.x-b.x||a.z-b.z||a.width-b.width||a.elevation-b.elevation);
  const parents=ordered.map((_,i)=>i);
  const root=(i:number):number=>parents[i]===i?i:(parents[i]=root(parents[i]!));
  for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
    const a=ordered[i]!,b=ordered[j]!,reach=(a.width+b.width)/2+padding*2;
    // Grid-cell margins are part of the supporting footprint. Two targets
    // cannot ask the same terrain vertex to be at different elevations.
    if(Math.abs(a.x-b.x)<reach&&Math.abs(a.z-b.z)<reach)parents[root(j)]=root(i);
  }
  const totals=new Map<number,{sum:number;count:number}>();
  ordered.forEach((site,i)=>{const key=root(i),group=totals.get(key)??{sum:0,count:0};group.sum+=site.elevation;group.count++;totals.set(key,group);});
  return ordered.map((site,i)=>{const group=totals.get(root(i))!;return {...site,elevation:group.sum/group.count};});
}
export function gradeSettlements(source:Float32Array,bounds:{x:number;z:number;width:number;height:number},resolution:number,sites:Site[],riverDistance:(x:number,z:number)=>number){
  const sums=new Float64Array(source.length),weights=new Float64Array(source.length),strengths=new Float64Array(source.length);
  const coreSums=new Float64Array(source.length),coreCounts=new Uint16Array(source.length);
  const dx=bounds.width/resolution,dz=bounds.height/resolution,padding=Math.max(dx,dz);
  // Stable accumulation prevents ordering-dependent seams in crowded counties.
  for(const site of sharedTerraces(sites,padding)){
    const inner=site.width/2+padding,falloff=Math.max(.2,site.width*1.5),outer=inner+falloff;
    const x0=Math.max(0,Math.floor((site.x-outer-bounds.x)/dx)),x1=Math.min(resolution,Math.ceil((site.x+outer-bounds.x)/dx));
    const z0=Math.max(0,Math.floor((site.z-outer-bounds.z)/dz)),z1=Math.min(resolution,Math.ceil((site.z+outer-bounds.z)/dz));
    for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++){
      const x=bounds.x+i*dx,z=bounds.z+j*dz,d=Math.max(Math.abs(x-site.x),Math.abs(z-site.z));
      const weight=(1-smooth((d-inner)/falloff))*smooth((riverDistance(x,z)-.06)/.09);
      if(weight<=0)continue;
      const k=j*(resolution+1)+i;
      // Interpolating weights approach exclusive ownership continuously at a
      // fully graded footprint; a neighbour's falloff must not tilt its floor.
      if(weight===1){coreSums[k]!+=site.elevation;coreCounts[k]!++;}
      else {
        const influence=weight/(1-weight);
        sums[k]!+=site.elevation*influence;weights[k]!+=influence;
      }
      strengths[k]=Math.max(strengths[k]!,weight);
    }
  }
  return Float32Array.from(source,(height,k)=>coreCounts[k]?coreSums[k]!/coreCounts[k]!:weights[k]?height+(sums[k]!/weights[k]!-height)*strengths[k]!:height);
}
