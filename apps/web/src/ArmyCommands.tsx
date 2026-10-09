import {useState} from 'react';
import type {BattleState,PlayerOrder} from './types';
import {formatTroops} from '../../api/src/domain/troopScale';
import {composition,UNIT_TYPES,UNIT_RULES} from '../../api/src/domain/troops';
import {availableCommanders} from '../../api/src/domain/commanders';
import {armySupplyCity,planArmyOrder} from '../../api/src/domain/fieldArmies';
import {validateAction} from '../../api/src/domain/rules';
import {remainingMarchTurns} from '../../api/src/domain/marching';
import {recruitmentPrice} from '../../api/src/domain/construction';
import {CharacterPortrait} from './CharacterPortrait';
export type ArmyIntent='march'|'field'|'raise'|null;
const ERRORS:Record<string,string>={NO_ROAD_ROUTE:'无法从当前位置抵达，请选择其他目标。',NOT_AT_WAR:'与该势力并未交战，请先通过外交宣战。',GARRISON_TOO_SMALL:'整编需至少 700 人守军，600 人成军，至少留下 100 人守城。',CITY_REQUIRED:'资源据点不能组建军队，请选择城池。',NOT_OWNER:'请选择己方城池。',ARMY_NEEDS_FRIENDLY_CAMP:'需要先在己方城池或两端均属己方的道路上驻扎。',INSUFFICIENT_RESOURCES:'国库不足。',AMBUSH_REQUIRES_FIELD:'先向野外行军，抵达后才能设伏。'};
export function ArmyCommands({state,playerId,disabled,selectedArmyId,onSelectArmy,onOrder,intent,onIntent,targetId}:{state:BattleState;playerId:string|null;disabled:boolean;selectedArmyId:string|null;onSelectArmy:(id:string)=>void;onOrder:(order:PlayerOrder)=>void;intent:ArmyIntent;onIntent:(intent:ArmyIntent)=>void;targetId:number|null}){
 const [recruiting,setRecruiting]=useState(false),[companies,setCompanies]=useState(1),[commanderId,setCommanderId]=useState<string>();
 const armies=(state.armies??[]).filter(a=>a.owner===playerId);
 const army=armies.find(a=>a.id===selectedArmyId),target=targetId===null?null:state.cities[targetId];
 const commanders=availableCommanders(state,playerId??'');
 const selectedCommander=commanders.find(c=>c.id===commanderId);
 const command=target&&intent==='raise'?{type:'raise-army' as const,cityId:target.id,...(selectedCommander?{commanderId:selectedCommander.id}:{})}:target&&army&&(intent==='march'||intent==='field')?{type:'order-army' as const,armyId:army.id,toCityId:target.id,...(intent==='field'?{stopProgress:.5}:{})}:null;
 const validation=command&&playerId?validateAction(state,playerId,command):null;
 const plan=command?.type==='order-army'&&army?planArmyOrder(state,army,command.toCityId,command.stopProgress):null;
 const turns=army&&plan?remainingMarchTurns(state,{...army,route:plan.route,leg:0,progress:plan.progress,halted:false,stance:'march',stopProgress:command?.type==='order-army'?command.stopProgress:undefined}):null;
 const supply=army?armySupplyCity(state,army):null;
 const issue=(action:PlayerOrder['action'])=>{if(!disabled&&playerId&&validateAction(state,playerId,action).ok)onOrder({agentId:playerId,action});};
 const chooseIntent=(next:ArmyIntent)=>{setRecruiting(false);onIntent(next);};
 if(!playerId)return <p>请先在“君主”选择扮演势力，再指挥自己的军队。</p>;
 return <div className="army-command-panel">
  <div className="army-roster" aria-label="己方军队">
   {armies.map(a=><button key={a.id} aria-pressed={army?.id===a.id} onClick={()=>{onSelectArmy(a.id);setRecruiting(false);}}><span className="army-banner">⚑</span><span><b>{a.name??state.characters?.find(c=>c.id===a.commanderId)?.name??'野战军'}</b><small>{formatTroops(a.troops)} 人 · {a.stance==='ambush'?'设伏':a.halted?'驻扎':'行军中'}</small></span></button>)}
   {!armies.length&&<p>尚无独立军队。先组建兵团，再选中军队出征。</p>}
   <button disabled={disabled} className="army-muster" onClick={()=>chooseIntent('raise')}>＋ 组建新军</button>
  </div>
  {intent==='raise'?<section className="army-task"><h3>组建新军</h3><p>在地图上选择己方城池，将 600 人守军整编为独立兵团。成军后可单独征募和出征，不再绑定城池。</p>
   <div className="commander-choices"><button aria-pressed={!selectedCommander} onClick={()=>setCommanderId(undefined)}>暂不任命主将</button>{commanders.map(c=><button key={c.id} aria-pressed={selectedCommander?.id===c.id} onClick={()=>setCommanderId(c.id)}><CharacterPortrait person={c}/><span>{c.name}<small>统率 {c.command}</small></span></button>)}</div>
  </section>:army&&<section className="army-task">
   <header><div><small>独立兵团</small><h3>{army.name??'野战军'}</h3></div><strong>{formatTroops(army.troops)} 人</strong></header>
   {army.commanderId&&<small>主将：{state.characters?.find(c=>c.id===army.commanderId&&c.owner===army.owner&&!c.capturedBy)?.name??'将领已离队'}</small>}
   <p>{army.route[army.leg]===army.route[army.leg+1]?`驻于 ${state.cities[army.route[army.leg]!]!.name}`:`${state.cities[army.route[army.leg]!]!.name} — ${state.cities[army.route[army.leg+1]!]!.name} 道路 ${Math.round(army.progress*100)}%`}</p>
   <div className="army-composition">{UNIT_TYPES.map(t=>composition(army)[t]>0&&<span key={t}>{UNIT_RULES[t].name} <b>{formatTroops(composition(army)[t])}</b></span>)}</div>
   <div className="army-verbs">
    <button disabled={disabled} aria-pressed={intent==='march'} onClick={()=>chooseIntent('march')}>行军</button>
    <button disabled={disabled} aria-pressed={intent==='field'} onClick={()=>chooseIntent('field')}>野外驻扎</button>
    <button disabled={disabled} aria-pressed={recruiting} onClick={()=>{onIntent(null);setRecruiting(true);}}>征募与补员</button>
    <button disabled={disabled||army.halted} onClick={()=>issue({type:'army-stance',armyId:army.id,stance:'camp'})}>停止行军并扎营</button>
    <button disabled={disabled||!validateAction(state,playerId,{type:'army-stance',armyId:army.id,stance:'ambush'}).ok||army.stance==='ambush'} onClick={()=>issue({type:'army-stance',armyId:army.id,stance:'ambush'})}>原地设伏</button>
    {army.stance==='ambush'&&<button disabled={disabled} onClick={()=>issue({type:'army-stance',armyId:army.id,stance:'camp'})}>解除伏击</button>}
   </div>
   {intent==='march'&&<p className="army-instruction">在地图上点击城池或资源据点，查看路线后确认出征。</p>}
   {intent==='field'&&<p className="army-instruction">在地图上选择行军方向的据点，部队将停在通往该据点的最后一段道路中部，不攻城；抵达后可设伏。</p>}
   {recruiting&&<div className="army-recruitment"><h4>为这支军队征募</h4><p>{supply?`补给地：${supply.name}。新兵战后入队，下回合参战。`:'必须先在己方领土驻扎才能征募；野外道路两端均须由己方控制。'}</p>
    <div className="recruit-count"><button aria-label="减少征募 100 人" disabled={companies<=1||disabled} onClick={()=>setCompanies(n=>n-1)}>−</button><b>{formatTroops(companies)} 人</b><button aria-label="增加征募 100 人" disabled={companies>=100||disabled} onClick={()=>setCompanies(n=>n+1)}>＋</button></div>
    {UNIT_TYPES.map(t=><button className="unit-recruit-card" key={t} disabled={disabled||!supply||(state.resources[playerId]??0)<companies*recruitmentPrice(supply??undefined,t)} onClick={()=>issue({type:'recruit-army',armyId:army.id,amount:companies,unitType:t})}><b>招募{UNIT_RULES[t].name} {formatTroops(companies)} 人</b><small>费用 {companies*recruitmentPrice(supply??undefined,t)} · 每回合军饷 +{Math.round(companies*UNIT_RULES[t].upkeep*100)/100}</small></button>)}
   </div>}
   {army.stance==='ambush'&&<p>伏击已布置：敌军通过同一道路时，首次野战获得 20% 战力优势，交战后转为驻扎。</p>}
  </section>}
  {intent&&<div className="army-target-confirm" role="status">
   <b>{target?`目标：${target.name}`:'等待选择地图目标'}</b>
   {plan&&<p>{plan.route.map(id=>state.cities[id]!.name).join(' → ')}<br/>预计 {turns} 回合{intent==='field'?' · 野外扎营':' · 敌方据点自动攻城'}</p>}
   {validation&&!validation.ok&&<p>{ERRORS[validation.code]??validation.code}</p>}
   <button className="primary-button" disabled={disabled||!command||!validation?.ok} onClick={()=>{if(command)issue(command);}}>{intent==='raise'?'确认成军并结束回合':'确认行军并结束回合'}</button>
   <button onClick={()=>onIntent(null)}>取消选点</button>
  </div>}
  <small>每次确认军令推进一回合，其他势力同时行动。城池守军与野战军分别计算军饷。</small>
 </div>;
}
