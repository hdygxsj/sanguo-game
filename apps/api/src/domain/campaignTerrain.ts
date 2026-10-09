import type {BattleState} from './types.js';
import {compactGeography} from './terrain/compactMap.js';
import {riverCityLayout} from './terrain/riverCityLayout.js';
import {createTerrainField} from './terrain/terrainField.js';
import {findTerrainRoad,type TerrainRoad} from './terrainRoad.js';

type MapState=Pick<BattleState,'map'|'cities'>;
function build(state:MapState){
  const stable=state.cities.map(c=>({...c,level:c.seat?2:1}));
  const projected=state.map!.id.endsWith('-bank-layout')?{cities:stable,map:state.map!}:compactGeography(stable,state.map!);
  const world=state.map!.id.endsWith('-bank-layout')?projected:riverCityLayout(projected.cities,projected.map);
  const field=createTerrainField(world.map,world.cities),cities=new Map(world.cities.map(c=>[c.id,c]));
  const routes=new Map<string,TerrainRoad|null>();
  const road=(from:number,to:number):TerrainRoad|null=>{
    const low=Math.min(from,to),high=Math.max(from,to),key=`${low}:${high}`;
    if(!routes.has(key)){
      const a=cities.get(low),b=cities.get(high);
      routes.set(key,a&&b?findTerrainRoad(field,[a.x,a.z],[b.x,b.z]):null);
    }
    const result=routes.get(key)!;
    return result&&from>to?{...result,points:[...result.points].reverse()}:result;
  };
  return {...world,field,road};
}
const worlds=new Map<string,ReturnType<typeof build>>(),states=new WeakMap<MapState,ReturnType<typeof build>>();
export function campaignTerrain(state:MapState){
  const known=states.get(state);if(known)return known;
  const key=JSON.stringify([state.map?.id,state.map?.outline,state.map?.ranges.map(r=>r.points),state.map?.rivers.map(r=>r.points),state.cities.map(c=>[c.id,c.x,c.z,c.seat,c.imperial])]);
  let world=worlds.get(key);
  if(!world){world=build(state);if(worlds.size>=3)worlds.delete(worlds.keys().next().value!);worlds.set(key,world);}
  states.set(state,world);return world;
}
export function terrainTravelCost(state:MapState,from:number,to:number){
  const a=state.cities.find(c=>c.id===from)!,b=state.cities.find(c=>c.id===to)!;
  const original=Math.max(.1,Math.hypot(a.x-b.x,a.z-b.z));
  if(!state.map)return original;
  const world=campaignTerrain(state),road=world.road(from,to);
  if(!road)return Infinity;
  const first=road.points[0]!,last=road.points.at(-1)!;
  return original*Math.max(1,road.cost/Math.max(.001,Math.hypot(first[0]-last[0],first[1]-last[1])));
}
