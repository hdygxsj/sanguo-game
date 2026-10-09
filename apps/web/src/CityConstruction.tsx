import type {BattleState,PlayerOrder} from './types';
import {BUILDINGS,BUILDING_TYPES,buildingCost} from '../../api/src/domain/construction';
import {developmentCost} from '../../api/src/domain/economy';
import {validateAction} from '../../api/src/domain/rules';
export function CityConstruction({state,cityId,playerId,disabled,onOrder}:{state:BattleState;cityId:number|null;playerId:string|null;disabled:boolean;onOrder:(order:PlayerOrder)=>void}){
 const city=cityId===null?null:state.cities[cityId];if(!city||city.owner!==playerId||!playerId)return <p>请从地图选择己方城池。</p>;
 const order=(building?:'farm'|'market'|'barracks')=>({type:'develop' as const,cityId:city.id,...(building?{building}:{})});
 return <div className="city-construction"><h2>{city.name}</h2><p>{city.level} 级城池 · 国库 {state.resources[playerId]??0}</p>
  {city.construction&&<p>在建：{BUILDINGS[city.construction.building].name} · 剩余 {Math.max(0,city.construction.completesTurn-state.turn)} 回合</p>}
  <button disabled={disabled||!validateAction(state,playerId,order()).ok} onClick={()=>onOrder({agentId:playerId,action:order()})}>扩建城池 · {developmentCost(city.level)}</button>
  {BUILDING_TYPES.map(t=><button key={t} disabled={disabled||!validateAction(state,playerId,order(t)).ok} onClick={()=>onOrder({agentId:playerId,action:order(t)})}><b>{BUILDINGS[t].name} · {city.buildings?.[t]??0}/3 级</b><small>{BUILDINGS[t].description}</small><span>建设费用 {buildingCost(city,t)}</span></button>)}
  <small>确认建设即结束回合。建筑槽随城池等级开放；已有工程完成前不能再次开工。军队征募请在“军队”中选择兵团。</small>
 </div>;
}
