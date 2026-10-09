import type { ArmyState,BattleState } from '../types';
import {campaignTerrain} from '../../../api/src/domain/campaignTerrain';
import {roadPosition} from '../../../api/src/domain/terrainRoad';

export function armyMapPosition(army:ArmyState,cities:readonly {id:number;x:number;z:number}[],state?:BattleState):[number,number]|null {
  const from=cities.find(c=>c.id===army.route[army.leg]),to=cities.find(c=>c.id===army.route[army.leg+1]);
  if(!from||!to||!Number.isFinite(army.progress))return null;
  if(from.id===to.id)return [from.x,from.z];
  const progress=Math.max(0,Math.min(1,army.progress));
  if(state?.map){const road=campaignTerrain(state).road(from.id,to.id);if(road)return roadPosition(road.points,progress);}
  return [from.x+(to.x-from.x)*progress,from.z+(to.z-from.z)*progress];
}
