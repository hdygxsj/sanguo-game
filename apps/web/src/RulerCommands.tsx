import {GameSelect} from './GameSelect';
import {formatTroops,companiesFromPeople} from '../../api/src/domain/troopScale';
import {useEffect,useState} from 'react';
import type {BattleState,PlayerOrder} from './types';
import {availableCommanders} from '../../api/src/domain/commanders';
import {effectiveAttributes} from '../../api/src/domain/equipment';
import {UNIT_TYPES,UNIT_RULES,troopSummary} from '../../api/src/domain/troops';
import type {UnitType,BuildingType} from '../../api/src/domain/types';
import {BUILDINGS,BUILDING_TYPES,buildingCost,recruitmentPrice,validateConstruction} from '../../api/src/domain/construction';
import {fiscalEstimate} from '../../api/src/domain/economy';
import {factionBonus} from '../../api/src/domain/factionTraits';
import {characterBudget} from '../../api/src/domain/characters';
import {tradePartners} from '../../api/src/domain/diplomacy';

export function RulerCommands({state,playerId,onPlayerChange,onOrder,disabled,focusedCityId,requestedAction}:{state:BattleState;playerId:string|null;onPlayerChange:(id:string)=>void;onOrder:(order:PlayerOrder)=>void;disabled:boolean;focusedCityId:number|null;requestedAction?:{kind:'recruit'|'develop'|'march'|'role';sequence:number}}) {
  const owned=state.cities.filter(c=>c.owner===playerId);
  const [sourceId,setSourceId]=useState(owned[0]?.id??-1);
  const [action,setAction]=useState('recruit');
  useEffect(()=>{if(requestedAction&&requestedAction.kind!=='role')setAction(requestedAction.kind);},[requestedAction]);
  const [people,setPeople]=useState(600);
  const amount=companiesFromPeople(people)??NaN;
  const [unitType,setUnitType]=useState<UnitType>('spear');
  const [building,setBuilding]=useState<BuildingType|'city'>('city');
  const [targetId,setTargetId]=useState(-1);
  const [query,setQuery]=useState('');
  const [commanderId,setCommanderId]=useState('');
  const commanders=availableCommanders(state,playerId??'');
  const commander=commanders.find(c=>c.id===commanderId);
  useEffect(()=>{if(!owned.some(c=>c.id===sourceId))setSourceId(owned[0]?.id??-1);},[playerId,state.cities,sourceId]);
  useEffect(()=>{if(focusedCityId!==null&&state.cities[focusedCityId]?.owner===playerId)setSourceId(focusedCityId);else if(focusedCityId!==null)setTargetId(focusedCityId);},[focusedCityId,playerId,state.cities]);
  const source=state.cities[sourceId],target=state.cities[targetId];
  const money=playerId?state.resources[playerId]??0:0;
  const budget=fiscalEstimate(owned,0,(state.armies??[]).filter(a=>a.owner===playerId));
  const personnel=characterBudget(state,playerId??''),trade=tradePartners(state,playerId??'').length*3;
  const net=budget.net+personnel.revenue-personnel.salary+trade+factionBonus(state,playerId??'').total;
  const cost=action==='recruit'?amount*recruitmentPrice(source,unitType):action==='develop'?(building==='city'?(source?.level??0)*20:source?buildingCost(source,building):0):0;
  const constructionCheck=source&&building!=='city'?validateConstruction(source,building,money):null;
  const constructionError=constructionCheck&&!constructionCheck.ok?({CONSTRUCTION_BUSY:'本县已有在建项目',BUILDING_SLOTS_FULL:'建筑槽已满，请先扩建城池',MAX_BUILDING_LEVEL:'该建筑已达最高等级',INSUFFICIENT_RESOURCES:'国库不足'}[constructionCheck.code]??constructionCheck.code):null;
  const active=state.agents.find(a=>a.id===playerId)?.active;
  const valid=!!playerId&&active&&(action==='hold'||source?.owner===playerId)&&cost<=money&&
    (action!=='develop'||!!source&&!source.construction&&(building==='city'?source.level<4:constructionCheck?.ok))&&(action!=='recruit'&&action!=='march'||Number.isInteger(amount)&&amount>0)&&
    (action!=='march'||!!target&&target.id!==sourceId&&target.terrain!=='blocked'&&amount<source!.troops);
  const submit=()=>{
    if(!valid||disabled||!playerId)return;
    onOrder({agentId:playerId,action:action==='hold'?{type:'hold'}:action==='develop'?{type:'develop',cityId:sourceId,...(building!=='city'?{building}:{})}:
      action==='recruit'?{type:'recruit',cityId:sourceId,amount,...(unitType!=='spear'?{unitType}:{})}:{type:target!.owner===playerId?'move':'attack',fromCityId:sourceId,toCityId:targetId,troops:amount,...(commander?{commanderId:commander.id}:{})}});
  };
  return <div className="ruler-commands">
    <label>扮演势力<GameSelect aria-label="扮演势力" value={playerId??''} disabled={disabled||!!state.playerAgentId} onChange={e=>onPlayerChange(e.target.value)}>
      <option value="" disabled>选择君主，开始亲自经营</option>{state.agents.map(a=><option key={a.id} value={a.id} disabled={!a.active}>{a.name}{!a.active?'（已覆灭）':''}</option>)}
    </GameSelect></label>
    {!state.playerAgentId&&<small>首次下令后身份固定；不选择可继续观看 AI 推演。</small>}
    {playerId&&<><p>国库 <b>{money}</b> · 领县 <b>{owned.length}</b></p>
      <details><summary>预估每回合净收支 {net>=0?'+':''}{net}</summary>
        <small>应征税收 {budget.grossRevenue} · 治理损耗 {budget.administrationLoss} · 实收 {budget.revenue}</small>
        <small>城池维护 {budget.maintenance} · 军饷 {budget.wages} · 人物俸禄 {personnel.salary}</small>
        <small>太守增收 {personnel.revenue} · 商约收入 {trade}</small>
        <small>势力特性额外收入与军饷返还 {factionBonus(state,playerId).total}（详见国政）</small>
        <small>超过 16 县后，地方维护后盈余的治理损耗渐增；军饷另计。此预算按当前疆域、驻军和在途部队估算，战事、建设竣工及家族事件可能改变实际结算。</small>
      </details>
      {!active&&<p>本势力已覆灭，可继续观战。</p>}
      <fieldset disabled={disabled||!active}>
        {(state.armies??[]).filter(a=>a.owner===playerId&&a.halted).map(army=>{
          const home=state.cities[army.route[army.leg]!],canRecall=home?.owner===playerId;
          return <div key={army.id}><small>边界停驻 · {formatTroops(army.troops)} 人 · {army.id}</small>
            {canRecall?<button onClick={()=>onOrder({agentId:playerId,action:{type:'recall-army',armyId:army.id}})}>撤回{home.name} · 结束回合</button>:<small>原退路已非己方领土，暂不能安全撤回。</small>}
          </div>;
        })}
        <label>行动<GameSelect aria-label="战略行动" value={action} onChange={e=>setAction(e.target.value)}>
          <option value="recruit">征募兵力</option><option value="develop">城池建设</option><option value="march">出征 / 调动</option><option value="hold">休整待命</option>
        </GameSelect></label>
        {action!=='hold'&&<label>出发 / 经营郡县<GameSelect aria-label="经营郡县" value={sourceId} onChange={e=>setSourceId(Number(e.target.value))}>
          {owned.map(c=><option key={c.id} value={c.id}>{c.commandery} · {c.name}（{formatTroops(c.troops)}人 / {c.level}级）</option>)}
        </GameSelect></label>}
        {action==='develop'&&source&&<>
          <label>建设项目<GameSelect aria-label="建设项目" value={building} onChange={e=>setBuilding(e.target.value as BuildingType|'city')}>
            <option value="city">扩建城池 · 当前 {source.level} 级</option>
            {BUILDING_TYPES.map(t=><option key={t} value={t}>{BUILDINGS[t].name} · 当前 {source.buildings?.[t]??0} 级</option>)}
          </GameSelect></label>
          <small>建筑槽 {BUILDING_TYPES.filter(t=>(source.buildings?.[t]??0)>0).length} / {Math.min(3,source.level)}；同类可升至 3 级，不额外占槽。</small>
          {building!=='city'&&<small>{BUILDINGS[building].description}。工期 2 回合，费用预付；城池易主时建筑和工程一并移交。</small>}
          {source.construction&&<p>在建：{BUILDINGS[source.construction.building].name} {source.construction.level} 级 · 还需 {Math.max(0,source.construction.completesTurn-state.turn)} 回合</p>}
          {constructionError&&<small role="status">{constructionError}</small>}
        </>}
        {action==='march'&&<><input aria-label="筛选目的地" placeholder="县名或郡名筛选…" value={query} onChange={e=>setQuery(e.target.value)}/>
          <label>目的郡县<GameSelect aria-label="目的郡县" value={targetId} onChange={e=>setTargetId(Number(e.target.value))}><option value={-1}>选择行军目的地</option>
            {state.cities.filter(c=>c.id!==sourceId&&c.terrain!=='blocked'&&(`${c.name}${c.commandery}`.includes(query)||c.id===targetId)).map(c=><option key={c.id} value={c.id}>{c.commandery} · {c.name}{c.owner===playerId?'（友军）':''}</option>)}
          </GameSelect></label><small>沿道路行军，途中可能遇敌；敌方城池自动攻打，必须留守至少 100 人。</small></>}
        {source&&action!=='hold'&&<small>驻军编制：{troopSummary(source)}</small>}
        {action==='recruit'&&<label>征募兵种<GameSelect aria-label="征募兵种" value={unitType} onChange={e=>setUnitType(e.target.value as UnitType)}>{UNIT_TYPES.map(t=><option key={t} value={t}>{UNIT_RULES[t].name} · 征募 {recruitmentPrice(source,t)} / 军饷 {UNIT_RULES[t].upkeep}</option>)}</GameSelect><small>枪克骑、刀盾克枪、弓克刀盾、骑克弓。骑兵行军快，但攻城较弱。军饷按兵种和人数逐回合支付。</small></label>}
        {(action==='recruit'||action==='march')&&<label>兵力数量 · 人<input aria-label="兵力数量" type="number" min={100} step={100} max={100*(action==='march'?Math.max(0,(source?.troops??1)-1):Math.floor(money/recruitmentPrice(source,unitType)))} value={people} onChange={e=>setPeople(Number(e.target.value))}/><small>以百人为一编制；征募费用与军饷均按每 100 人计算。{!Number.isFinite(amount)?'请输入 100 的正整数倍。':''}</small></label>}
        {action==='recruit'&&<small>征募费用预付，本回合战斗结束后入伍，下回合才可参战；若本回合城池失守，征募取消并退款。</small>}
        {!!cost&&<p>本次耗资 {cost}{cost>money?' · 国库不足':''}</p>}
        {action==='march'&&state.characters&&<label>统军将领<GameSelect aria-label="统军将领" value={commander?.id??''} onChange={e=>setCommanderId(e.target.value)}><option value="">不指定将领</option>{commanders.map(c=><option key={c.id} value={c.id}>{c.name} · 统率 {effectiveAttributes(state,c).command}（战力 +{effectiveAttributes(state,c).command/5}%）</option>)}</GameSelect><small>出征后不可兼任太守或再次出征；战斗自动结算，败军将领可能被俘。</small></label>}
        <button className="primary-button" disabled={disabled||!valid} onClick={submit}>下令并结束回合</button>
      </fieldset>
      <small>点击地图上的己方城池可选为出发地；点击其他县可选为目的地。每回合一道君主指令，其余势力同时行动。</small>
    </>}
  </div>;
}
