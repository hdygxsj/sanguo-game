import { useEffect, useState } from 'react';
import type { LearnedPolicy } from './types';
import {trainingProgress,type ProgressStatus} from './trainingProgress';
import './arena/historical-map.css';

interface Status extends ProgressStatus { status: string; error?: string; policy?: LearnedPolicy }
export function TrainingPanel() {
  const [status,setStatus]=useState<Status|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    const poll=()=>fetch('/api/training',{credentials:'include'}).then(async r=>{
      if(!r.ok) throw new Error('无法读取训练状态'); return r.json() as Promise<Status>;
    }).then(s=>{if(active) setStatus(s);}).catch(e=>{if(active) setError(e.message);});
    void poll(); const timer=setInterval(poll,2500);
    return()=>{active=false;clearInterval(timer);};
  },[]);
  const start=async()=>{
    setBusy(true);setError('');
    try { const r=await fetch('/api/training',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({episodes:100})});
      const s=await r.json(); if(!r.ok) throw new Error(s.error?.message??'训练失败');setStatus(s);
    } catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const p=status?.policy, running=status?.status==='running';
  const progress=status?trainingProgress(status):null;
  return <section className="training-panel">
    <div><div className="eyebrow left">SELF-PLAY LAB</div><h3>强化学习训练场</h3>
      <p>{running?progress!.text:
        p?`已训练 ${p.episodes} 局 · 新战局自动使用此策略`:'通过自我对战学习攻守、征兵与发展策略'}</p>
      {p&&<small>{p.evaluation.unresolvedRate === undefined ? '旧版领土积分评估（不是统一胜率）' :
        `独立评测 ${p.evaluation.games} 局 · 统一胜率 ${(p.evaluation.winRate*100).toFixed(1)}% · 未决 ${(p.evaluation.unresolvedRate*100).toFixed(1)}% · 评测预算 ${p.evaluation.horizon} 回合（不限制战役）`}</small>}
      {running&&<progress aria-label={progress!.label} value={progress!.value} max={progress!.max}/>}
      {(error||status?.error)&&<p role="alert">{error||status?.error}</p>}
    </div><button className="ghost-button" onClick={()=>void start()} disabled={busy||running}>{running?'训练进行中…':'训练 100 局'}</button>
  </section>;
}
