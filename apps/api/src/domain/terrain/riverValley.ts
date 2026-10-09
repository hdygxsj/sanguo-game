/** Visual world units, after the shared compact-map projection. */
export const RIVER_VALLEY={floor:.025,floodplain:.1,upland:.46} as const;

export function riverValleyHeight(uplandHeight:number,riverDistance:number){
  const t=Math.max(0,Math.min(1,(riverDistance-RIVER_VALLEY.floodplain)/(RIVER_VALLEY.upland-RIVER_VALLEY.floodplain)));
  const blend=t*t*(3-2*t);
  return RIVER_VALLEY.floor+(uplandHeight-RIVER_VALLEY.floor)*blend;
}
