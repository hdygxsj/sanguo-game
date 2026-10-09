import {GameSelect} from './GameSelect';
import {useState} from 'react';
import type {BattleState,PlayerOrder} from './types';
import {isMinor} from '../../api/src/domain/lifecycle';
import {talentCost} from '../../api/src/domain/talents';
import {validatePersonnel} from '../../api/src/domain/characters';
import {CharacterPortrait} from './CharacterPortrait';
import {talentDiscovered} from '../../api/src/domain/talentRefresh';

export function TalentsPanel({state,playerId,disabled,onOrder}:{state:BattleState;playerId:string;disabled:boolean;onOrder:(order:PlayerOrder)=>void}){
  const [selected,setSelected]=useState('');
  const candidates=(state.characters??[]).filter(p=>p.owner===null&&!p.capturedBy&&!p.ruler&&!isMinor(p)&&talentDiscovered(state,p));
  const person=candidates.find(p=>p.id===selected)??candidates[0];
  if(!person)return <section><h3>人才寻访</h3><p>本回合暂无可招募人才，请推进回合后再查看。</p></section>;
  const action={type:'recruit-character' as const,characterId:person.id};
  const allowed=!disabled&&state.status==='active'&&state.agents.some(a=>a.id===playerId&&a.active)&&validatePersonnel(state,playerId,action).ok;
  return <section aria-label="人才寻访"><h3>人才寻访</h3><p>第 {state.turn} 回合 · 可接触 {candidates.length} 人</p><p>每回合新增 6 名随机武将，刷新 8 位三国人物的寻访线索。已招募者永久保留；未招募的随机人物将在下回合离开。刷新页面不会重抽。</p>
    <label>在野人物<GameSelect aria-label="在野人物" value={person.id} disabled={disabled} onChange={e=>setSelected(e.target.value)}>{candidates.map(p=><option key={p.id} value={p.id}>{p.name} · {p.origin==='generated'?'随机武将':'三国人物'} · 政务 {p.politics} / 统率 {p.command}</option>)}</GameSelect></label>
    <CharacterPortrait person={person}/>
    <p>{person.name} · {person.sex==='female'?'女':'男'} · {person.ageYears} 岁</p>
    <button disabled={!allowed} onClick={()=>onOrder({agentId:playerId,action})}>礼聘入仕 · {talentCost(person)}</button>
    <small>消耗一回合，入仕忠诚 55，之后正常领取俸禄。可搜索姓名、“三国人物”或“随机武将”。年龄、能力与在野身份为跨时代沙盒设定；共用肖像不代表专属立绘，随机武将为虚构人物。</small>
  </section>;
}
