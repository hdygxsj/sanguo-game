import {GameSelect} from './GameSelect';
import {useState} from 'react';
import {COURT_OFFICES,courtHolder,courtOffice,validateCourt} from '../../api/src/domain/court';
import type {CourtOffice} from '../../api/src/domain/types';
import type {BattleState,PlayerOrder} from './types';

export function CourtPanel({state,playerId,characterId,disabled,onOrder}:{state:BattleState;playerId:string;characterId:string;disabled:boolean;onOrder:(order:PlayerOrder)=>void}){
  const [office,setOffice]=useState<CourtOffice>('chancellor');
  const current=courtOffice(state,characterId),job=COURT_OFFICES[office];
  const appointment={type:'appoint-court' as const,characterId,office},dismiss={type:'dismiss-court' as const,characterId};
  const valid=validateCourt(state,playerId,appointment);
  const errors:Record<string,string>={RULER_CANNOT_SERVE:'君主不能兼任自己的中央官位。',OFFICE_CONFLICT:'需先卸任当前官位或太守。',COURT_OCCUPIED:'此职位已有人任职。',CHARACTER_COMMANDING:'领军在途，需返回后任免。',CHARACTER_CAPTURED:'被俘人物不能任职。',CHARACTER_UNDERAGE:'未满 18 岁不能任职。',LOYALTY_TOO_LOW:'任命需要至少 50 忠诚。',INSUFFICIENT_RESOURCES:'国库不足以支付任命费用。'};
  const locked=disabled||!state.agents.find(a=>a.id===playerId)?.active;
  return <details className="court-panel"><summary>中央官位</summary>
    <p>{(Object.keys(COURT_OFFICES) as CourtOffice[]).map(o=>`${COURT_OFFICES[o].name}：${courtHolder(state,playerId,o)?.name??'空缺'}`).join(' · ')}</p>
    <p>当前人物：{current?COURT_OFFICES[current].name:'未任中央官位'}</p>
    <fieldset disabled={locked}>
      <label>任命官位<GameSelect aria-label="任命官位" value={office} onChange={e=>setOffice(e.target.value as CourtOffice)}>{(Object.keys(COURT_OFFICES) as CourtOffice[]).map(o=><option key={o} value={o}>{COURT_OFFICES[o].name} · 额外俸禄 {COURT_OFFICES[o].salary}/回合</option>)}</GameSelect></label>
      {!valid.ok&&<small>{errors[valid.code]??'当前无法任命。'}</small>}
      <button disabled={locked||!valid.ok} onClick={()=>onOrder({agentId:playerId,action:appointment})}>任命{job.name} · {job.cost}</button>
      <button disabled={locked||!validateCourt(state,playerId,dismiss).ok} onClick={()=>onOrder({agentId:playerId,action:dismiss})}>卸任中央官位</button>
    </fieldset>
    <small>每职限一人，不兼太守。丞相按政务×忠诚÷1000 增收（取整，上限 8），太府卿÷1500（上限 5）；大将军按统率×忠诚÷125000 为己方行军部队提供至多 6% 指挥加成，可亲自领军。丞相、太府卿不能出征。俸禄在基础俸禄之外收取。任命 +8 忠诚，卸任 −10；每项命令结束一回合，被俘或离开势力后失效。</small>
  </details>;
}
