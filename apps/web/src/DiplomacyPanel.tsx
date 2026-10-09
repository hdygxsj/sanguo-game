import {GameSelect} from './GameSelect';
import {useEffect,useState} from 'react';
import {diplomaticScore,relationBetween,tradePartners,treatyNames,validateDiplomacy} from '../../api/src/domain/diplomacy';
import type {BattleState,PlayerOrder,Treaty} from './types';

export function DiplomacyPanel({state,playerId,disabled,onOrder,notice}:{state:BattleState;playerId:string|null;disabled:boolean;onOrder:(order:PlayerOrder)=>void;notice?:string}) {
  const others=state.agents.filter(a=>a.active&&a.id!==playerId);
  const [target,setTarget]=useState(others[0]?.id??'');
  const [treaty,setTreaty]=useState<Treaty>('peace');
  const [gift,setGift]=useState(20);
  const [marry,setMarry]=useState(false),[personId,setPersonId]=useState(''),[partnerId,setPartnerId]=useState('');
  useEffect(()=>{if(!others.some(a=>a.id===target))setTarget(others[0]?.id??'');},[playerId,state.agents,target]);
  const relation=playerId?relationBetween(state,playerId,target):null;
  useEffect(()=>{setTreaty(relation?.status==='war'?'peace':relation?.trade?'alliance':'trade');},[target,relation?.status,relation?.trade]);
  if(!playerId)return <div className="ruler-commands"><p>请先在“君主”面板选择你要扮演的势力，再派遣使者。</p></div>;
  const active=state.agents.find(a=>a.id===playerId)?.active;
  const ownPeople=(state.characters??[]).filter(p=>p.owner===playerId),theirPeople=(state.characters??[]).filter(p=>p.owner===target&&!p.ruler);
  const person=ownPeople.find(p=>p.id===personId)??ownPeople[0],partner=theirPeople.find(p=>p.id===partnerId)??theirPeople.find(p=>p.sex!==person?.sex)??theirPeople[0];
  const action={type:'diplomacy' as const,targetAgentId:target,treaty,offer:treaty==='war'?0:gift,...(marry&&['peace','alliance'].includes(treaty)?{marriage:{personId:person?.id??'',partnerId:partner?.id??''}}:{})};
  const validation=validateDiplomacy(state,playerId,action);
  const score=diplomaticScore(state,playerId,target,treaty,action.offer);
  const inbox=(state.diplomaticOffers??[]).filter(o=>o.to===playerId);
  const errors:Record<string,string>={KINGDOM_ALLIANCE_FORBIDDEN:'立国后不能结盟，仍可停战、通商或通过停战提案联姻。',INVALID_MARRIAGE_TERMS:'联姻仅用于停战或结盟，礼金至少 40。',INVALID_MARRIAGE_TARGET:'请选择双方人物；对方君主不能迁入。',MARRIAGE_PENDING:'人物已有待答复的联姻提案。',HOUSEHOLD_OCCUPIED:'联姻双方必须尚无婚姻或侧室关系。',ADULT_AGE_REQUIRED:'双方需要明确年龄并年满 18 岁。',FAMILY_UNAVAILABLE:'人物被俘、领军中或忠诚不足 50。',KINSHIP_RESTRICTED:'近亲或同姓氏族不能婚配。',INVALID_UNION_PAIR:'此剧本婚配要求一男一女。',TRUCE_ACTIVE:'约期内不能宣战',PEACE_REQUIRED:'先停战才能结盟或通商',ALREADY_AT_WAR:'双方已经交战',ALREADY_AT_PEACE:'双方已经停战',ALREADY_ALLIED:'双方已经结盟',ALREADY_TRADING:'已有商约',TRADE_LIMIT:'一方已达到 3 个贸易伙伴上限',OFFER_PENDING:'已有使者等待答复',INSUFFICIENT_RESOURCES:'礼金不合法或国库不足',TRADE_CITY_REQUIRED:'双方都需要城池才能通商'};
  return <div className="ruler-commands diplomacy-panel">
    <p>国库 {state.resources[playerId]??0} · 商约 {tradePartners(state,playerId).length} / 3</p>
    {notice&&<p role="status" className="diplomacy-notice">{notice}</p>}
    {inbox.map(o=><section className="diplomacy-offer" key={o.id}>
      <b>{state.agents.find(a=>a.id===o.from)?.name} 提议{treatyNames[o.treaty]}</b>
      <p>礼金 {o.offer} · 第 {o.expiresTurn} 回合结算后到期</p>
      {o.marriage&&<p>联姻：{state.characters?.find(p=>p.id===o.marriage!.personId)?.name} 与 {state.characters?.find(p=>p.id===o.marriage!.partnerId)?.name}；后者将迁入 {state.agents.find(a=>a.id===o.from)?.name} 势力。</p>}
      <button disabled={disabled||!active||!validateDiplomacy(state,playerId,{type:'respond-diplomacy',offerId:o.id,accept:true}).ok} onClick={()=>onOrder({agentId:playerId,action:{type:'respond-diplomacy',offerId:o.id,accept:true}})}>接受提议</button>
      <button disabled={disabled||!active} onClick={()=>onOrder({agentId:playerId,action:{type:'respond-diplomacy',offerId:o.id,accept:false}})}>拒绝提议</button>
    </section>)}
    <fieldset disabled={disabled||!active}>
      <label>交涉对象<GameSelect aria-label="交涉对象" value={target} onChange={e=>setTarget(e.target.value)}>{others.map(a=><option key={a.id} value={a.id}>{a.name} · {({war:'交战',peace:'停战',alliance:'同盟'} as const)[relationBetween(state,playerId,a.id).status]}</option>)}</GameSelect></label>
      {relation&&<p>关系 {relation.relation} · {relation.trade?'已有商约':'暂无商约'}{relation.truceUntil>state.turn?` · 约期至 ${relation.truceUntil} 回合`:''}</p>}
      <label>外交提议<GameSelect aria-label="外交提议" value={treaty} onChange={e=>setTreaty(e.target.value as Treaty)}>
        <option value="peace">停战</option><option value="alliance">结盟</option><option value="trade">通商</option><option value="war">宣战 / 破盟</option>
      </GameSelect></label>
      {state.characters&&['peace','alliance'].includes(treaty)&&<>
        <label><input type="checkbox" aria-label="附加联姻条款" checked={marry} onChange={e=>{setMarry(e.target.checked);if(e.target.checked)setGift(Math.max(40,gift));}}/>附加联姻条款 · {treaty==='peace'?'和亲停战':'联姻结盟'}</label>
        {marry&&<><label>己方婚配人物<GameSelect aria-label="己方婚配人物" value={person?.id??''} onChange={e=>setPersonId(e.target.value)}>{ownPeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</GameSelect></label>
          <label>对方婚配人物<GameSelect aria-label="对方婚配人物" value={partner?.id??''} onChange={e=>setPartnerId(e.target.value)}>{theirPeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</GameSelect></label>
          <small>双方须为未婚成年人物；礼金至少 40。接受后，对方非君主人物迁入己方、卸任原职，装备留在原府库；拒绝不生效。</small></>}
      </>}
      {treaty!=='war'&&<label>外交礼金<input aria-label="外交礼金" type="number" min={0} step={1} max={state.resources[playerId]??0} value={gift} onChange={e=>setGift(Number(e.target.value))}/></label>}
      {!validation.ok?<p>{errors[validation.code]??'当前不能提出此协议'}</p>:treaty!=='war'?<small>当前评估：{score>=0?'倾向接受':'倾向拒绝'}，以回合结算为准。</small>:<small>宣战将立即终止双方商约，并使关系降至 -70。</small>}
      <button className="primary-button" disabled={disabled||!active||!validation.ok} onClick={()=>onOrder({agentId:playerId,action})}>派遣使者并结束回合</button>
    </fieldset>
    <small>停战保护 6 回合，结盟保护 8 回合。同盟允许过境，但不能驻入或占领盟友城池。每份商约双方各获 3 / 回合；最多 3 个伙伴。AI 拒绝不扣礼金；等待玩家答复的礼金托管，到期或拒绝退还。</small>
    <details><summary>各方关系</summary>{others.map(a=><p key={a.id}><b style={{color:a.color}}>{a.name}</b> · {({war:'交战',peace:'停战',alliance:'同盟'} as const)[relationBetween(state,playerId,a.id).status]} · {relationBetween(state,playerId,a.id).relation}</p>)}</details>
  </div>;
}
