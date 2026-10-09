export type RoadPoint=[number,number];
export type RoadField={bounds:{x:number;z:number;width:number;height:number};height:(x:number,z:number)=>number;contains:(x:number,z:number)=>boolean};
export type TerrainRoad={points:RoadPoint[];length:number;cost:number};
export const MAX_ROAD_GRADE=.45;
const SAMPLE=.015,GRID=.03;
const gridCosts=new WeakMap<RoadField,Map<number,number>>();
const directions=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1],[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[1,-2],[-1,2],[1,2]];

/** Every segment is sampled: neither smoothing nor diagonal steps can cut a cliff. */
function segment(field:RoadField,a:RoadPoint,b:RoadPoint):TerrainRoad|null{
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(length/SAMPLE));
  const points:RoadPoint[]=[a];let cost=0,previous=field.height(...a);
  if(!field.contains(...a))return null;
  for(let i=1;i<=count;i++){
    const p:RoadPoint=[a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count];
    if(!field.contains(...p))return null;
    const h=field.height(...p),run=length/count,grade=Math.abs(h-previous)/Math.max(run,1e-9);
    if(grade>MAX_ROAD_GRADE)return null;
    cost+=Math.hypot(run,h-previous)*(1+grade*2);previous=h;points.push(p);
  }
  return {points,length,cost};
}
class Queue{
  items:{id:number;priority:number}[]=[];
  push(id:number,priority:number){const a=this.items;let i=a.length;a.push({id,priority});while(i){const p=(i-1)>>1;if(a[p]!.priority<=priority)break;a[i]=a[p]!;i=p;}a[i]={id,priority};}
  pop(){const a=this.items,first=a[0],last=a.pop();if(!a.length)return first;let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1]!.priority<a[j]!.priority)j++;if(a[j]!.priority>=last!.priority)break;a[i]=a[j]!;i=j;}a[i]=last!;return first;}
}

export function findTerrainRoad(field:RoadField,a:RoadPoint,b:RoadPoint):TerrainRoad|null{
  const direct=segment(field,a,b);
  if(direct)return direct;
  const bounds=field.bounds,cols=Math.ceil(bounds.width/GRID)+1,rows=Math.ceil(bounds.height/GRID)+1;
  let costs=gridCosts.get(field);if(!costs){costs=new Map();gridCosts.set(field,costs);}
  const point=(id:number):RoadPoint=>[bounds.x+(id%cols)*GRID,bounds.z+Math.floor(id/cols)*GRID];
  const nearby=(p:RoadPoint)=>{
    const x=Math.round((p[0]-bounds.x)/GRID),z=Math.round((p[1]-bounds.z)/GRID),result:{id:number;path:TerrainRoad}[]=[];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const i=x+dx,j=z+dz;if(i<0||j<0||i>=cols||j>=rows)continue;
      const id=j*cols+i,path=segment(field,p,point(id));if(path)result.push({id,path});
    }return result;
  };
  const starts=nearby(a),ends=new Map(nearby(b).map(e=>[e.id,e.path]));
  if(!starts.length||!ends.size)return null;
  const queue=new Queue(),g=new Map<number,number>(),previous=new Map<number,number>(),closed=new Set<number>();
  const heuristic=(id:number)=>{const p=point(id);return Math.hypot(p[0]-b[0],p[1]-b[1]);};
  for(const start of starts){g.set(start.id,start.path.cost);queue.push(start.id,start.path.cost+heuristic(start.id));}
  let found:number|undefined,expanded=0;
  while(queue.items.length&&expanded++<20000){
    const id=queue.pop()!.id;if(closed.has(id))continue;closed.add(id);
    if(ends.has(id)){found=id;break;}
    const x=id%cols,z=Math.floor(id/cols),p=point(id);
    for(const [dx,dz] of directions){
      const i=x+dx!,j=z+dz!;if(i<0||j<0||i>=cols||j>=rows)continue;
      const next=j*cols+i;if(closed.has(next))continue;
      const key=Math.min(id,next)*(cols*rows)+Math.max(id,next);
      let cost=costs.get(key);if(cost===undefined){cost=segment(field,p,point(next))?.cost??Infinity;costs.set(key,cost);}if(!Number.isFinite(cost))continue;
      const score=g.get(id)!+cost;if(score>=(g.get(next)??Infinity))continue;
      g.set(next,score);previous.set(next,id);queue.push(next,score+heuristic(next));
    }
  }
  if(found===undefined)return null;
  const ids=[found];while(previous.has(ids[0]!))ids.unshift(previous.get(ids[0]!)!);
  const anchors:RoadPoint[]=[a,...ids.map(point),b];
  // Only remove waypoints when the entire replacement is traversable.
  const simplified:RoadPoint[]=[a];let index=0;
  while(index<anchors.length-1){let next=Math.min(index+12,anchors.length-1);while(next>index+1&&!segment(field,anchors[index]!,anchors[next]!))next--;simplified.push(anchors[next]!);index=next;}
  const result:TerrainRoad={points:[a],length:0,cost:0};
  for(let i=1;i<simplified.length;i++){const leg=segment(field,simplified[i-1]!,simplified[i]!);if(!leg)return null;result.points.push(...leg.points.slice(1));result.length+=leg.length;result.cost+=leg.cost;}
  return result;
}

export function roadPosition(points:RoadPoint[],progress:number):RoadPoint{
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i]![0]-points[i-1]![0],points[i]![1]-points[i-1]![1]);
  let remaining=length*Math.max(0,Math.min(1,progress));
  for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!,d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(remaining<=d)return [a[0]+(b[0]-a[0])*remaining/(d||1),a[1]+(b[1]-a[1])*remaining/(d||1)];remaining-=d;}
  return points.at(-1)??[0,0];
}
