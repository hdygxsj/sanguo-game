import {useEffect,useRef,useState} from 'react';
import {HISTORICAL_FACTIONS} from '../../api/src/domain/factions';
import {factionTrait} from '../../api/src/domain/factionTraits';
import {simplified} from './simplified';
import {PORTRAITS} from './CharacterPortrait';

export function NewCampaign({busy,onStart,onClose}:{busy:boolean;onStart:(id?:string)=>void;onClose:()=>void}){
  const [role,setRole]=useState<string|undefined>('agent-1');
  const dialog=useRef<HTMLElement>(null);
  useEffect(()=>{dialog.current?.focus();},[]);
  return <div className="modal-backdrop"><section ref={dialog} tabIndex={-1} className="campaign-start" role="dialog" aria-modal="true" aria-label="开始新征途" onKeyDown={e=>{
    if(e.key==='Escape'&&!busy)onClose();
    if(e.key==='Tab'){
      const items=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if(!items?.length)return;
      if(e.shiftKey&&(document.activeElement===items[0]||document.activeElement===dialog.current)){e.preventDefault();items[items.length-1]!.focus();}
      else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0]!.focus();}
    }
  }}>
    <header><div><small>汉末乱世 · 群雄逐鹿</small><h2>选择你的征途</h2></div><button aria-label="取消开局" disabled={busy} onClick={onClose}>×</button></header>
    <p>扮演一方君主，经营城池、任用将领、结交诸侯。积累名望立国，守住首都十年获胜；也可征服所有势力。</p>
    <p>精简天下 · 300 处城池与资源据点。攻占农庄、矿场和马场，掌握战争财源。</p>
    <div className="campaign-modes"><button aria-pressed={!!role} disabled={busy} onClick={()=>setRole('agent-1')}>执掌一方</button><button aria-pressed={!role} disabled={busy} onClick={()=>setRole(undefined)}>旁观天下</button></div>
    {role?<div className="faction-choice-grid">{HISTORICAL_FACTIONS.map((f,i)=><button key={f.name} disabled={busy} aria-label={`选择${f.name}`} aria-pressed={role===`agent-${i+1}`} onClick={()=>setRole(`agent-${i+1}`)} style={{borderColor:role===`agent-${i+1}`?f.color:undefined}}><img src={`/images/portraits/${PORTRAITS[f.name]}.jpg`} alt="" loading="lazy"/><b>{f.name}</b><small>{simplified(f.commandery)}</small></button>)}</div>:<div className="spectator-intro"><h3>静观天下风云</h3><p>所有势力由电脑控制。你可以查看城池、人物、外交与战报，也可以自动推进回合。</p></div>}
    {role&&<p className="kingdom-warning"><b>{factionTrait(HISTORICAL_FACTIONS[Number(role.slice(6))-1]!.name).name}</b> · {factionTrait(HISTORICAL_FACTIONS[Number(role.slice(6))-1]!.name).description}</p>}
    <footer><small>{role?'每回合一道指令，战斗自动结算。开局后君主身份固定。':'观战不会替任何势力下令。'}</small><button className="primary-button" disabled={busy} onClick={()=>onStart(role)}>{busy?'整备中…':role?'开始征途':'开始观战'}</button></footer>
  </section></div>;
}
