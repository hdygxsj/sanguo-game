import {validatePersonnel} from '../../api/src/domain/characters';
import type {BattleState,PlayerOrder} from './types';
export function CaptivesPanel({state,playerId,disabled,onOrder}:{state:BattleState;playerId:string;disabled:boolean;onOrder:(order:PlayerOrder)=>void}){
  const captives=(state.characters??[]).filter(c=>c.capturedBy===playerId);
  return <details open={captives.length>0}><summary>俘虏 · {captives.length}</summary>
    {captives.map(c=>{
      const recruit={type:'recruit-captive' as const,characterId:c.id},release={type:'release-captive' as const,characterId:c.id};
      const active=state.agents.find(a=>a.id===playerId)?.active;
      return <section className="diplomacy-offer" key={c.id}><b>{c.name} · 统率 {c.command} / 政务 {c.politics}</b>
        <p>原属 {state.agents.find(a=>a.id===c.owner)?.name??'在野'} · 对原主忠诚 {c.loyalty}</p>
        <button disabled={disabled||!active||!validatePersonnel(state,playerId,recruit).ok} onClick={()=>onOrder({agentId:playerId,action:recruit})}>{c.loyalty>50?'劝降 · 10':'招降 · 30'}</button>
        <button disabled={disabled||!active} onClick={()=>onOrder({agentId:playerId,action:release})}>释放</button>
      </section>;
    })}
    <small>劝降降低对原主忠诚 15；不高于 50 时可招降，入仕忠诚 50。释放后回归尚存的原势力；每项操作消耗一回合。俘虏不领取原势力俸禄。</small>
  </details>;
}
