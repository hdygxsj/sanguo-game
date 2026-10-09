import {useState} from 'react';
import type {BattleState,PlayerOrder} from './types';
import {GameSelect} from './GameSelect';
import {KINGDOM_RULES,initialCapital,kingdomOf,rankName,prestigeGain,migrationCost} from '../../api/src/domain/kingdom';
import {factionTrait,factionBonus} from '../../api/src/domain/factionTraits';
import {validateAction} from '../../api/src/domain/rules';
import {TalentsPanel} from './TalentsPanel';

const errors:Record<string,string>={
  PRESTIGE_REQUIRED:'名望尚未达到 300',KINGDOM_TERRITORY_REQUIRED:'至少控制 6 处据点',INITIAL_CAPITAL_REQUIRED:'必须收复开局城，才能定都立国',
  INSUFFICIENT_RESOURCES:'国库不足',INVALID_KINGDOM_NAME:'国号须为 1–6 个汉字',KINGDOM_NAME_TAKEN:'已有国家使用此国号',
  REFOUND_COOLDOWN:'亡国后需等待 8 回合才能重新立国',MIGRATION_COOLDOWN:'立国或迁都后需间隔 8 回合',CAPITAL_CITY_REQUIRED:'请选择己方非资源城池',
  AGENT_INACTIVE:'当前不能下令',ALREADY_CAPITAL:'这座城已经是首都',CAPITAL_LOST:'首都已经失守',
};
export function KingdomPanel({state,playerId,disabled,onOrder}:{state:BattleState;playerId:string|null;disabled:boolean;onOrder:(order:PlayerOrder)=>void}){
  const [inspect,setInspect]=useState(state.agents[0]?.id??''),[name,setName]=useState<string>(),[destination,setDestination]=useState(-1);
  const [section,setSection]=useState<'kingdom'|'talents'>('kingdom');
  const id=playerId??inspect,agent=state.agents.find(a=>a.id===id);
  if(!agent)return null;
  const country=kingdomOf(state,id),polity=state.polities?.[id],prestige=polity?.prestige??0,origin=initialCapital(state,id);
  const trait=factionTrait(agent.name),bonus=factionBonus(state,id),gain=prestigeGain(state,id);
  const eligible=state.cities.filter(c=>c.owner===id&&c.id!==country?.capitalId&&(!c.siteKind||c.siteKind==='city')&&c.terrain!=='blocked');
  const city=eligible.find(c=>c.id===destination)??eligible[0],countryName=name??trait.kingdom;
  const action=country?{type:'move-capital' as const,cityId:city?.id??-1}:{type:'found-kingdom' as const,name:countryName};
  const validation=validateAction(state,id,action),years=country?Math.max(0,state.turn-country.foundedTurn):0;
  const submit=()=>{if(playerId&&!disabled&&validation.ok)onOrder({agentId:id,action});};
  const tabs=<nav role="tablist" aria-label="国策事务" className="personnel-tabs"><button role="tab" aria-selected={section==='kingdom'} onClick={()=>setSection('kingdom')}>立国与名望</button><button role="tab" aria-selected={section==='talents'} onClick={()=>setSection('talents')}>人才寻访</button></nav>;
  if(section==='talents')return <div className="kingdom-panel">{tabs}{playerId?<TalentsPanel state={state} playerId={playerId} disabled={disabled} onOrder={onOrder}/>:<p>观战模式，不能寻访或招募人才。</p>}</div>;
  return <div className="kingdom-panel">
    {tabs}
    {!playerId&&<label>查看诸侯<GameSelect aria-label="查看诸侯" value={id} onChange={e=>setInspect(e.target.value)}>{state.agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</GameSelect></label>}
    <div className="kingdom-heading"><span className="kingdom-seal">{rankName(state,id)}</span><div><small>{country?'社稷已立':'积望立国'}</small><h2>{country?`${country.name}国`:agent.name}</h2><p>{country?`君主 ${agent.name}`:'经营疆土，积累天下声望'}</p></div></div>
    <section className="kingdom-prestige" aria-label="名望进度"><div><b>名望 {prestige}</b><span>每回合 +{agent.active?gain.total:0}</span></div><progress aria-label="立国名望" max={300} value={Math.min(300,prestige)}/><small>士族 → 男 → 子 → 伯 → 侯 → 公 → 立国为王</small>
      <dl className="prestige-sources"><div><dt>经济</dt><dd>+{gain.economy}</dd></div><div><dt>领地</dt><dd>+{gain.territory}</dd></div><div><dt>军力</dt><dd>+{gain.military}</dd></div><div><dt>建设</dt><dd>+{gain.construction}</dd></div><div><dt>特性</dt><dd>+{gain.trait}</dd></div></dl>
      <details><summary>名望来源与爵位</summary><p>每 60 名望晋一爵，300 为公，可申请立国。每回合：税收与特性产业商贸每 12 获得 1（最多 6）；每 3 处领地获得 1（最多 6）；每 4,000 人获得 1（最多 4）；城池扩建与建筑每 3 级获得 1（最多 4）。仅已完成建设计入。亡国后降为公、名望减少 100。</p></details>
    </section>
    <section className="kingdom-trait"><small>势力特性</small><h3>{trait.name}</h3><p>{trait.description}</p><p>本回合预估：产业 +{bonus.estates} · 商贸 +{bonus.trade} · 军饷返还 +{bonus.wages}</p><small>收入和返还向下取整，实际按回合结算时的领地与部队计算。</small></section>
    {country?<section className="kingdom-survival"><h3>守护社稷</h3><p>首都：{state.cities[country.capitalId]?.name??'已失守'}</p><b>{Math.min(40,years)} / 40 回合</b><progress aria-label="立国胜利进度" max={40} value={Math.min(40,years)}/><p>{Math.floor(years/4)} 年 {years%4} 季 · 距立国胜利 {Math.max(0,40-years)} 回合</p><p className="kingdom-warning">首都被攻占即刻亡国、降为公；夺回首都不会恢复旧进度。</p></section>:
      <section><h3>{polity?.fallen?'重整社稷':'立国条件'}</h3><ul className="kingdom-requirements"><li>名望 {prestige} / 300</li><li>领地 {state.cities.filter(c=>c.owner===id).length} / 6</li><li>开局城：{origin?.name??'无可用城池'}{origin?.owner!==id?'（未控制）':'（已控制）'}</li><li>国库 {state.resources[id]??0} / 200</li></ul>{!!polity?.refoundAfterTurn&&polity.refoundAfterTurn>state.turn&&<p>可重新立国：第 {polity.refoundAfterTurn} 回合</p>}</section>}
    {playerId&&<fieldset disabled={disabled||!agent.active}>
      {country?<><label>新首都<GameSelect aria-label="新首都" value={city?.id??-1} onChange={e=>setDestination(Number(e.target.value))}>{!eligible.length&&<option value={-1}>没有可迁入的城池</option>}{eligible.map(c=><option key={c.id} value={c.id}>{c.name} · {c.level}级</option>)}</GameSelect></label><small>迁都耗资 200 + 新首都等级 × 20；每次间隔 8 回合，立国年限保留。下一次可迁都：第 {country.lastMigrationTurn+8} 回合。</small></>:
        <><label>国号<input aria-label="国号" maxLength={6} value={countryName} onChange={e=>setName(e.target.value)} placeholder="输入国号"/></label><p className="kingdom-warning">立国将解除本势力所有联盟，与原盟友进入战争、终止双方商约；联盟提议礼金退还。立国期间不能重新结盟，仍可停战、通商和联姻。</p><p>开局城成为首都。立国当回合不计时，之后存续十年（40 回合）获胜。</p></>}
      {!validation.ok&&<p role="status">{errors[validation.code]??validation.code}</p>}
      <button className="primary-button" disabled={disabled||!validation.ok} onClick={submit}>{country?`迁都 · ${city?migrationCost(state,city.id):'—'}`:`立国 · ${KINGDOM_RULES.cost}`}</button><small>确认后结束一回合。</small>
    </fieldset>}
    {!playerId&&<p>观战模式，只能查看国政。</p>}
  </div>;
}
