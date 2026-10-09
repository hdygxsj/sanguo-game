import {useId,useMemo} from 'react';
import type {BattleState} from '../types';
import {buildTerritories,NEUTRAL_COLOR} from './territories';
import {mapBounds} from './compactMap';

export function CampaignMinimap({state,selected,onSelect}:{state:BattleState;selected:number|null;onSelect:(id:number)=>void}){
  const key=`${state.map!.id}:${state.cities.map(c=>`${c.id},${c.x},${c.z}`).join(';')}`;
  const cells=useMemo(()=>buildTerritories(state.cities,state.map!.outline).cells,[key]);
  const bounds=useMemo(()=>mapBounds(state.map!.outline,.3),[key]);
  const cities=new Map(state.cities.map(c=>[c.id,c])),colors=new Map(state.agents.map(a=>[a.id,a.color]));
  const focus=selected===null?null:cities.get(selected);
  const clip=useId().replace(/:/g,'');
  return <aside className="campaign-minimap"><header><span>天下</span><small>点选定位 · 北 ↑</small></header>
    <svg aria-label="天下小地图" viewBox={`${bounds.x} ${bounds.z} ${bounds.width} ${bounds.height}`}>
      <defs><clipPath id={clip}><polygon points={state.map!.outline.map(p=>p.join(',')).join(' ')}/></clipPath></defs>
      <g clipPath={`url(#${clip})`}>{cells.map(cell=>{const city=cities.get(cell.id)!;return <path key={cell.id} data-mini-county={cell.id} d={cell.points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' ')+'Z'} fill={colors.get(city.owner??'')??NEUTRAL_COLOR} role="button" tabIndex={city.seat?0:-1} aria-label={`定位${city.name}`} onClick={()=>onSelect(city.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(city.id);}}}><title>{city.name}</title></path>;})}</g>
      {focus&&<circle data-mini-focus cx={focus.x} cy={focus.z} r={bounds.width*.025} fill="none" stroke="#fff5cb" strokeWidth={bounds.width*.007} pointerEvents="none"/>}
      {Object.values(state.polities??{}).flatMap(p=>{const k=p.kingdom,c=k?cities.get(k.capitalId):undefined;if(!k||!c)return [];const r=bounds.width*.014;return <path key={k.capitalId} d={`M${c.x} ${c.z-r} L${c.x+r} ${c.z} L${c.x} ${c.z+r} L${c.x-r} ${c.z} Z`} fill="#f2d58f" stroke="#302a20" strokeWidth={r*.25} role="button" tabIndex={0} aria-label={`定位${k.name}国首都${c.name}`} onClick={()=>onSelect(c.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.id);}}}><title>{k.name}国首都 · {c.name}</title></path>;})}
    </svg>
    <small>{focus?.name??'选择一处城池查看与经营'}</small>
  </aside>;
}
