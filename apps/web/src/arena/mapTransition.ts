export const DEFAULT_MAP_TRANSITION={preload:1.6,models:[2.2,5.6] as [number,number],relief:[1.3,5.4] as [number,number],political:[1.4,6.4] as [number,number],shadows:[3.8,6.5] as [number,number],maxZoom:32,maxCities:56};
export const smoothRange=(value:number,[start,end]:[number,number])=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*(3-2*t);};
export function transitionAt(zoom:number,config=DEFAULT_MAP_TRANSITION){
  const models=smoothRange(zoom,config.models),detail=smoothRange(zoom,config.relief);
  return {political:1-.96*smoothRange(zoom,config.political),relief:.035+.965*detail,models,icons:1-models,shadows:smoothRange(zoom,config.shadows),detail};
}
export function lodActive(active:boolean,zoom:number,enter:number,leave:number){return active?zoom>leave:zoom>=enter;}
export function nearestCounty(cities:readonly {id:number;x:number;z:number}[],x:number,z:number){
  let id=-1,distance=Infinity;
  for(const city of cities){const d=(city.x-x)**2+(city.z-z)**2;if(d<distance){distance=d;id=city.id;}}
  return id;
}
