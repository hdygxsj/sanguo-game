import type {TerrainField} from './terrainField';
type Town={x:number;z:number;width:number};
export function garrisonSlots(city:Town,field:Pick<TerrainField,'height'|'contains'>,water:(x:number,z:number)=>boolean,towns:Town[]):{x:number;y:number;z:number}[]{
  const nearby=towns.filter(t=>Math.hypot(t.x-city.x,t.z-city.z)<city.width+.4+t.width);
  for(const extra of [.035,.07,.11])for(let direction=0;direction<12;direction++){
    const angle=Math.PI/2+direction*Math.PI/6,radius=city.width*.64+extra;
    const cx=city.x+Math.cos(angle)*radius,cz=city.z+Math.sin(angle)*radius;
    const slots=Array.from({length:8},(_,i)=>{
      const x=cx+(i%4-1.5)*.012,z=cz+(Math.floor(i/4)-.5)*.015;
      return {x,y:field.height(x,z),z};
    });
    const valid=slots.every(({x,z})=>{
      const e=.004,slope=Math.hypot((field.height(x+e,z)-field.height(x-e,z))/(2*e),(field.height(x,z+e)-field.height(x,z-e))/(2*e));
      return field.contains(x,z)&&!water(x,z)&&slope<.45&&nearby.every(t=>Math.max(Math.abs(x-t.x),Math.abs(z-t.z))>t.width*.64+.008);
    });
    if(valid)return slots;
  }
  return [];
}
