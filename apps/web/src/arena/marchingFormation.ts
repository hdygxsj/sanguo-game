import type {ArmyState,BattleState} from '../types';
import {armyMapPosition} from './armyMap';
import {garrisonUnitSlots} from './garrisonComposition';
export function marchingFormation(army:ArmyState,cities:readonly {id:number;x:number;z:number}[],state?:BattleState):{x:number;z:number;rotation:number;unit:string;destination:number}[]{
  const point=armyMapPosition(army,cities,state);if(!point||army.troops<=0)return [];
  const from=cities.find(c=>c.id===army.route[army.leg])!,to=cities.find(c=>c.id===army.route[army.leg+1])!;
  const ahead=armyMapPosition({...army,progress:Math.min(1,army.progress+.003)},cities,state)!,behind=armyMapPosition({...army,progress:Math.max(0,army.progress-.003)},cities,state)!;
  const moving=Math.hypot(ahead[0]-behind[0],ahead[1]-behind[1])>1e-8;
  const rotation=Math.atan2(moving?ahead[0]-behind[0]:to.x-from.x,moving?ahead[1]-behind[1]:to.z-from.z),dx=Math.sin(rotation),dz=Math.cos(rotation);
  const units=garrisonUnitSlots(army.troops,army.units,8);
  const slots=units.map((unit,i)=>({unit,side:(i%2)*.014,along:Math.floor(i/2)*.016}));
  const side=slots.reduce((sum,p)=>sum+p.side,0)/slots.length,along=slots.reduce((sum,p)=>sum+p.along,0)/slots.length;
  return slots.map(p=>({unit:p.unit,x:point[0]+(p.side-side)*dz+(p.along-along)*dx,
    z:point[1]-(p.side-side)*dx+(p.along-along)*dz,rotation,destination:to.id}));
}
