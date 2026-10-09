import {GameSelect} from './GameSelect';
import type {BattleState,PlayerOrder} from './types';
import {useState} from 'react';
import {validateFamily,unionCost} from '../../api/src/domain/family';
export function FamilyPanel({state,playerId,personId,disabled,onOrder,expanded=false}:{state:BattleState;playerId:string;personId:string;disabled:boolean;onOrder:(order:PlayerOrder)=>void;expanded?:boolean}){
  const [partner,setPartner]=useState(''),[kind,setKind]=useState<'spouse'|'concubine'>('spouse');
  const people=(state.characters??[]).filter(p=>p.owner===playerId&&p.id!==personId);
  const selected=people.find(p=>p.id===partner)??people.find(p=>validateFamily(state,playerId,{type:'form-union',personId,partnerId:p.id,kind}).ok)??people[0];
  const action={type:'form-union' as const,personId,partnerId:selected?.id??'',kind};
  const valid=validateFamily(state,playerId,action);
  const errors:Record<string,string>={INVALID_FAMILY_PARTICIPANTS:'需要选择本势力的两名不同人物。',ADULT_AGE_REQUIRED:'双方必须有明确年龄且年满 18 岁；旧人物缺少年龄时不能婚配。',FAMILY_UNAVAILABLE:'被俘、领军中或忠诚低于 50 的人物不能缔结关系。',KINSHIP_RESTRICTED:'已记录近亲或同姓氏族不能婚配。',INVALID_UNION_PAIR:'此剧本婚配要求一男一女。',HOUSEHOLD_OCCUPIED:'已有配偶、从属其他家族或侧室数量已满。',INSUFFICIENT_RESOURCES:'国库不足以支付婚仪费用。'};
  const links=(state.unions??[]).filter(u=>u.personId===personId||u.partnerId===personId);
  return <details open={expanded||undefined} className={`family-panel ${expanded?'panel-expanded':''}`}><summary>婚姻与家族</summary>
    {links.length?links.map(u=><p key={u.id}>{state.characters?.find(p=>p.id===(u.personId===personId?u.partnerId:u.personId))?.name??'未知人物'} · {u.kind==='spouse'?'配偶':u.personId===personId?'侧室':'家主'} · 第 {u.formedTurn} 回合</p>):<p>尚无婚姻关系</p>}
    {links.filter(u=>u.pregnancyDueTurn!==undefined).map(u=><p key={`${u.id}-pregnancy`}>预计第 {u.pregnancyDueTurn} 回合添丁</p>)}
    <p>子女</p>
    {!(state.characters??[]).some(p=>p.parentIds?.includes(personId))&&<p className="section-intro">暂无子女。缔结婚姻后，符合年龄、同势力、未出征等条件的家庭会随回合推进尝试孕育；不是下令后立即生子。</p>}
    {(state.characters??[]).filter(p=>p.parentIds?.includes(personId)).map(p=><p key={p.id}>{p.name} · {p.ageYears??0} 岁 · {(p.ageYears??0)<18?'未成年':'已成年'}</p>)}
    <fieldset disabled={disabled}>
      <label>关系类型<GameSelect aria-label="关系类型" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="spouse">婚配</option><option value="concubine">纳妾</option></GameSelect></label>
      <label>婚配对象<GameSelect aria-label="婚配对象" value={selected?.id??''} onChange={e=>setPartner(e.target.value)}>{people.map(p=><option value={p.id} key={p.id}>{p.name} · {p.ageYears===undefined?'年龄未记录':`${p.ageYears} 岁`}</option>)}</GameSelect></label>
      {!valid.ok&&<p>{errors[valid.code]??'当前不能缔结关系。'}</p>}
      <button disabled={disabled||!valid.ok||!state.agents.find(a=>a.id===playerId)?.active} onClick={()=>{setPartner(action.partnerId);onOrder({agentId:playerId,action});}}>缔结关系 · {unionCost(kind)}</button>
    </fieldset>
    <small>命令结束一回合，双方忠诚 +5。每人一位正配，男性家主最多三位侧室。年龄每 4 回合增长 1 岁。符合条件的家庭每 4 回合有 25% 添丁机会，孕期 3 回合，孕育支出 20；产后间隔至少 8 回合。子女抚养费每回合 1，18 岁成年。跨势力联姻请前往外交面板。年龄与家庭为架空沙盘设定；寿终与继承尚未开放。</small>
  </details>;
}
