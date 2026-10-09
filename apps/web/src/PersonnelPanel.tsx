import {GameSelect} from './GameSelect';
import {useState} from 'react';
import {characterBudget,validatePersonnel} from '../../api/src/domain/characters';
import type {BattleAction,BattleState,PlayerOrder} from './types';
import {commandingArmy} from '../../api/src/domain/commanders';
import {CaptivesPanel} from './CaptivesPanel';
import {EquipmentPanel} from './EquipmentPanel';
import {effectiveAttributes} from '../../api/src/domain/equipment';
import {FamilyPanel} from './FamilyPanel';
import {isMinor} from '../../api/src/domain/lifecycle';
import {CharacterPortrait} from './CharacterPortrait';
import {CourtPanel} from './CourtPanel';
import {courtOffice,COURT_OFFICES} from '../../api/src/domain/court';

export function PersonnelPanel({state,playerId,disabled,onOrder,notice,onDiplomacy}:{state:BattleState;playerId:string|null;disabled:boolean;onOrder:(order:PlayerOrder)=>void;notice?:string;onDiplomacy?:()=>void}){
  const [selected,setSelected]=useState(''),[location,setLocation]=useState('');
  const [section,setSection]=useState<'service'|'family'|'equipment'>('service');
  if(!playerId)return <div className="ruler-commands"><p>请先在“君主”面板选择势力，再管理人物。</p></div>;
  if(!state.characters)return <div className="ruler-commands"><p>此旧存档尚未启用人物系统；新建历史战局即可使用。旧回放和玩法保持不变。</p></div>;
  const people=state.characters.filter(c=>c.owner===playerId);
  const person=people.find(c=>c.id===selected)??people[0];
  if(!person)return <div className="ruler-commands"><p>本势力暂无在籍人物。可前往“国策 → 人才寻访”招募。</p><CaptivesPanel state={state} playerId={playerId} disabled={disabled} onOrder={onOrder}/></div>;
  const cities=state.cities.filter(c=>c.owner===playerId&&c.terrain!=='blocked');
  const city=cities.find(c=>String(c.id)===location)??cities[0];
  const budget=characterBudget(state,playerId);
  const attributes=effectiveAttributes(state,person);
  const centralOffice=courtOffice(state,person.id);
  const appointment={type:'appoint-governor' as const,characterId:person.id,cityId:city?.id??-1};
  const reward={type:'reward-character' as const,characterId:person.id};
  const dismiss={type:'dismiss-governor' as const,characterId:person.id};
  const allowed=(action:typeof appointment|typeof reward|typeof dismiss)=>!disabled&&!!state.agents.find(a=>a.id===playerId)?.active&&validatePersonnel(state,playerId,action).ok;
  const order=(action:BattleAction)=>onOrder({agentId:playerId,action});
  const errors:Record<string,string>={CHARACTER_COMMANDING:'正在领军，不能兼任太守。',CHARACTER_CAPTURED:'此人物已被俘，无法任职。',GOVERNOR_OCCUPIED:'该城已有太守，请先卸任或选择其他城池。',LOYALTY_TOO_LOW:'忠诚低于 30，需先赏赐安抚。',INSUFFICIENT_RESOURCES:'国库不足。',NOT_OWNER:'需要一座己方城池。'};
  const valid=validatePersonnel(state,playerId,appointment);
  return <div className="ruler-commands personnel-panel">
    <p>在籍 {people.length} 人 · 国库 {state.resources[playerId]??0}<br/>治理增收 +{budget.revenue} / 回合 · 人物俸禄 −{budget.salary} / 回合</p>
    {notice&&<p role="status" className="diplomacy-notice">{notice}</p>}
    <label>选择人物<GameSelect aria-label="选择人物" value={person.id} onChange={e=>setSelected(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.name} · {p.capturedBy?'被俘':isMinor(p)?'未成年':commandingArmy(state,p.id)?'领军':p.ruler?'君主':p.governorCityId!==null?'太守':'待命'} · 忠诚 {p.loyalty}</option>)}</GameSelect></label>
    <section className="personnel-profile"><CharacterPortrait person={person}/><div className="personnel-profile-data"><h3>{person.name} <small>{person.sex==='female'?'女':'男'} · {isMinor(person)?'家族子女':person.ruler?'君主':'臣属'}</small></h3>
      <p>政务 {attributes.politics} · 统率 {attributes.command} · 忠诚 {person.loyalty}</p>
      {person.ageYears!==undefined&&<p>{person.ageYears} 岁{person.ageYears<18?' · 未成年，不能任职、领军或婚配':''}</p>}
      <meter aria-label="人物忠诚" min={0} max={100} low={30} high={70} optimum={100} value={person.loyalty}/>
      <p>任职：{person.capturedBy?`被 ${state.agents.find(a=>a.id===person.capturedBy)?.name} 俘获`:isMinor(person)?'家族抚养':centralOffice?COURT_OFFICES[centralOffice].name:commandingArmy(state,person.id)?'领军出征':person.governorCityId!==null?`${state.cities[person.governorCityId]?.name} 太守`:'待命'}</p>
    </div></section>
    <div role="tablist" aria-label="人物事务" className="personnel-tabs">{([['service','任职统军'],['family','婚姻子嗣'],['equipment','兵器坐骑']] as const).map(([id,title])=><button type="button" role="tab" key={id} aria-selected={section===id} onClick={()=>setSection(id)}>{title}</button>)}</div>
    <section role="tabpanel" aria-label="任职统军" hidden={section!=='service'}>
    <p className="section-intro">任命官职、治理城池，或在“君主 → 出征”中选为统军将领。统率影响自动战斗，坐骑影响行军。</p>
    <fieldset disabled={disabled}>
      <label>任职城池<GameSelect aria-label="任职城池" value={city?.id??''} onChange={e=>setLocation(e.target.value)}>{cities.map(c=><option key={c.id} value={c.id}>{c.commandery} · {c.name}{state.characters!.some(p=>p.governorCityId===c.id)?' · 已有太守':''}</option>)}</GameSelect></label>
      {!valid.ok&&<small>{valid.code==='CHARACTER_UNDERAGE'?'未满 18 岁，不能任职。':errors[valid.code]??'当前不能任命'}</small>}
      <button className="primary-button" disabled={!allowed(appointment)} onClick={()=>order(appointment)}>任命太守 · 10</button>
      <button disabled={!allowed(dismiss)} onClick={()=>order(dismiss)}>卸任太守</button>
      <button disabled={!allowed(reward)} onClick={()=>order(reward)}>赏赐安抚 · 15</button>
    </fieldset>
    <small>每项命令均结束一回合。太守增收按政务与忠诚计算（最高 4），仅作用于驻地；调任会自动卸下原职。每人在籍俸禄 1，太守 2。赏赐提升 15 忠诚，卸任降低 10；任职且足薪每回合 +1，待命每 4 回合 −1，欠薪 −12；忠诚归零会辞官，君主除外。</small>
    <CourtPanel state={state} playerId={playerId} characterId={person.id} disabled={disabled} onOrder={onOrder}/>
    <CaptivesPanel state={state} playerId={playerId} disabled={disabled} onOrder={onOrder}/>
    <p>寻访在野人物请前往“国策 → 人才寻访”。</p>
    </section>
    <section role="tabpanel" aria-label="兵器坐骑" hidden={section!=='equipment'}><EquipmentPanel expanded state={state} playerId={playerId} characterId={person.id} disabled={disabled} onOrder={onOrder}/></section>
    <section role="tabpanel" aria-label="婚姻子嗣" hidden={section!=='family'}>
      <FamilyPanel expanded state={state} playerId={playerId} personId={person.id} disabled={disabled} onOrder={onOrder}/>
      {onDiplomacy&&<button type="button" className="primary-button" onClick={onDiplomacy}>前往外交联姻</button>}
    </section>
    <details><summary>剧本说明</summary><p>人物包含历史与演义角色，归属、成年年龄和能力为游戏设定，男女成年后均可任职。统率为自动战斗提供最高 20% 加成；君主败军脱身，其他将领可能被俘。首批立绘为 AI 生成的原创艺术演绎，不代表真实历史容貌；其余人物立绘、寿终与继承尚待补齐。</p></details>
  </div>;
}
