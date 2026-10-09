import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {campaignTerrain,terrainTravelCost} from './campaignTerrain.js';
import {MAX_ROAD_GRADE} from './terrainRoad.js';
import {historicGeography} from './hanGeography.js';

it.each([false,true])('keeps full=%s geography connected by slope-safe roads and charges for detours',(full)=>{
  const state=generateBattle('terrain-roads');
  if(full)Object.assign(state,historicGeography(()=>.5));
  const world=campaignTerrain(state);
  const links=new Map(state.cities.map(c=>[c.id,[] as number[]]));
  let detours=0;
  for(const city of state.cities)for(const id of city.adjacent){
    if(id<city.id)continue;
    const road=world.road(city.id,id);if(!road)continue;
    links.get(city.id)!.push(id);links.get(id)!.push(city.id);
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1]!,b=road.points[i]!;
      const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
      if(distance>1e-9)expect(Math.abs(world.field.height(...a)-world.field.height(...b))/distance).toBeLessThanOrEqual(MAX_ROAD_GRADE+1e-6);
    }
    const first=road.points[0]!,last=road.points.at(-1)!;
    if(road.length>Math.hypot(first[0]-last[0],first[1]-last[1])*1.1){
      detours++;
      const target=state.cities[id]!;
      expect(terrainTravelCost(state,city.id,id)).toBeGreaterThan(Math.hypot(city.x-target.x,city.z-target.z)*1.1);
    }
    expect(world.road(id,city.id)!.points).toEqual([...road.points].reverse());
  }
  const seen=new Set([0]),queue=[0];
  while(queue.length)for(const id of links.get(queue.pop()!)!)if(!seen.has(id)){seen.add(id);queue.push(id);}
  expect(seen.size).toBe(full?1184:300);expect(detours).toBeGreaterThan(full?100:0);
  const upgraded={...state,cities:state.cities.map(c=>({...c,level:4}))};
  expect(campaignTerrain(upgraded)).toBe(world);
  const visual=campaignTerrain({...state,map:world.map,cities:world.cities});
  expect(visual.field.heights).toEqual(world.field.heights);
},30000);
