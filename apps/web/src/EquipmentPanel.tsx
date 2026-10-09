import {GameSelect} from './GameSelect';
import {useState} from 'react';
import {EQUIPMENT_CATALOG,equipmentDefinition,validateEquipment} from '../../api/src/domain/equipment';
import type {EquipmentAction} from '../../api/src/domain/equipment';
import type {BattleState,PlayerOrder} from './types';
const slots={weapon:'兵器',mount:'坐骑',treasure:'宝物'} as const;
export function EquipmentPanel({state,playerId,characterId,disabled,onOrder,expanded=false}:{state:BattleState;playerId:string;characterId:string;disabled:boolean;onOrder:(order:PlayerOrder)=>void;expanded?:boolean}){
  const [template,setTemplate]=useState('iron-sword'),[itemId,setItemId]=useState('');
  const inventory=(state.equipment??[]).filter(i=>i.owner===playerId&&!i.bearerId);
  const item=inventory.find(i=>i.id===itemId)??inventory[0];
  const definition=equipmentDefinition(template)!;
  const allowed=(action:EquipmentAction)=>!disabled&&state.status==='active'&&!!state.agents.find(a=>a.id===playerId)?.active&&validateEquipment(state,playerId,action).ok;
  const buy={type:'buy-equipment' as const,templateId:template};
  const equip={type:'equip-equipment' as const,characterId,itemId:item?.id??''};
  const validation=validateEquipment(state,playerId,buy);
  return <details open={expanded||undefined} className={`equipment-panel ${expanded?'panel-expanded':''}`}><summary>装备与府库</summary>
    <p>每项操作消耗一回合。出征或被俘期间不能换装；替换装备退回府库，败军被俘时随身装备被缴获。</p>
    {(['weapon','mount','treasure'] as const).map(slot=>{
      const equipped=state.equipment?.find(i=>i.owner===playerId&&i.bearerId===characterId&&equipmentDefinition(i.templateId)?.slot===slot);
      const action={type:'unequip-equipment' as const,characterId,slot};
      return <p key={slot}>{slots[slot]}：{equipped?equipmentDefinition(equipped.templateId)?.name:'未装备'} {equipped&&<button disabled={!allowed(action)} onClick={()=>onOrder({agentId:playerId,action})}>卸下{slots[slot]}</button>}</p>;
    })}
    <label>府库装备<GameSelect aria-label="府库装备" value={item?.id??''} onChange={e=>setItemId(e.target.value)}><option value="" disabled>暂无闲置装备</option>{inventory.map(i=><option key={i.id} value={i.id}>{equipmentDefinition(i.templateId)?.name}</option>)}</GameSelect></label>
    <button disabled={!allowed(equip)} onClick={()=>onOrder({agentId:playerId,action:equip})}>装备给当前人物</button>
    <label>寻访购置<GameSelect aria-label="寻访购置" value={template} onChange={e=>setTemplate(e.target.value)}>{EQUIPMENT_CATALOG.map(d=><option key={d.id} value={d.id}>{d.name} · {d.price}{d.unique?' · 天下唯一':''}</option>)}</GameSelect></label>
    <p>{slots[definition.slot]} · 统率 +{definition.command} · 政务 +{definition.politics} · 行军 +{Math.round(definition.speed*100)}%</p>
    {!validation.ok&&<small>{validation.code==='ITEM_SOLD'?'天下已有此物，不能重复购置。':validation.code==='INSUFFICIENT_RESOURCES'?'国库不足。':'需要己方城池与人物系统。'}</small>}
    <button disabled={!allowed(buy)} onClick={()=>onOrder({agentId:playerId,action:buy})}>购入 · {definition.price}</button>
    <small>属性含装备后最高 100，行军加成最高 15%。道具名称取材历史与演义，效果为游戏设定。</small>
  </details>;
}
