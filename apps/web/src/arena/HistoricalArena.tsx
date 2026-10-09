import {formatTroops} from '../../../api/src/domain/troopScale';
import {GameSelect} from '../GameSelect';
import { useEffect, useMemo, useState } from 'react';
import type { BattleState } from '../types';
import { searchKey } from './countySearch';
import { compactGeography } from './compactMap';
import {riverCityLayout} from './riverCityLayout';
import { ZoomTerrainMap } from './ZoomTerrainMap';
import { mapPigment } from './mapPalette';
import { mapResource, NEUTRAL_COLOR, RESOURCE_LABELS } from './territories';
import './historical-map.css';
import {CampaignMinimap} from './CampaignMinimap';
import {CityActions,type CityCommand} from '../CityActions';
import {diplomaticPigment,DIPLOMATIC_COLORS} from './diplomaticPalette';

export function HistoricalArena({state:source,onSelectCity,playerId=null,commandsDisabled=false,onCityAction,onSelectArmy,selectedArmyId,targeting}: {state:BattleState;onSelectCity?:(id:number|null)=>void;playerId?:string|null;commandsDisabled?:boolean;onCityAction?:(action:CityCommand,id:number)=>void;onSelectArmy?:(id:string)=>void;selectedArmyId?:string|null;targeting?:boolean}) {
  const compact=true;
  const [mapMode,setMapMode]=useState<'faction'|'diplomacy'>('faction');
  const geographyKey=source.cities.map(c=>`${c.id}:${c.x}:${c.z}:${c.imperial}:${c.seat}`).join('|');
  const geography=useMemo(()=>{
    const projected=compact?compactGeography(source.cities,source.map!):{cities:source.cities,map:source.map!};
    return riverCityLayout(projected.cities,projected.map);
  },[geographyKey,source.map?.id,compact]);
  const state=useMemo(()=>{
    const positions=new Map(geography.cities.map(c=>[c.id,c]));
    return {...source,map:geography.map,cities:source.cities.map(c=>({...c,x:positions.get(c.id)!.x,z:positions.get(c.id)!.z})),agents:source.agents.map((a,i)=>({...a,color:mapMode==='diplomacy'&&playerId?diplomaticPigment(source,playerId,a.id):mapPigment(i)}))};
  },[source,geography,mapMode,playerId]);
  const [selected,setSelected]=useState<number|null>(null);
  const [query,setQuery]=useState('');
  const [province,setProvince]=useState('');
  const [showIndex,setShowIndex]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [reset,setReset]=useState(0);
  const city=selected===null?null:state.cities.find(c=>c.id===selected);
  const resource=city?mapResource(city):null;
  const results=useMemo(()=>state.cities.filter(c=>(!province||c.province===province)&&(!query||searchKey(c.name+c.commandery+c.province).includes(searchKey(query)))),[state.cities,query,province]);
  useEffect(()=>{
    if(!expanded)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};
    window.addEventListener('keydown',escape);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);};
  },[expanded]);
  const select=(id:number)=>{setSelected(id<0?null:id);onSelectCity?.(id<0?null:id);};
  return <div className={'historical-arena strategic-arena '+(expanded?'map-expanded':'')}>
    <ZoomTerrainMap state={state} selected={selected} onSelect={select} reset={reset} onSelectArmy={onSelectArmy} selectedArmyId={selectedArmyId}/>
    <section className="political-view-controls" aria-label="地图着色"><span>战略地图</span><div><button aria-pressed={mapMode==='faction'} onClick={()=>setMapMode('faction')}>势力版图</button><button aria-pressed={mapMode==='diplomacy'} disabled={!playerId} title={!playerId?'选择扮演势力后可查看外交关系':undefined} onClick={()=>setMapMode('diplomacy')}>外交关系</button><button onClick={()=>{setSelected(null);setReset(n=>n+1);}}>天下全图</button></div>{mapMode==='diplomacy'&&<div className="diplomatic-key">{(['self','alliance','peace','war'] as const).map((key,i)=><span key={key}><i style={{background:DIPLOMATIC_COLORS[key]}}/>{['己方','盟友','和平','交战'][i]}</span>)}</div>}</section>
    <div className="map-tools">
      <button onClick={()=>setShowIndex(v=>!v)}>寻找城池</button>
      <button aria-label={expanded?'收起地图':'展开地图'} onClick={()=>setExpanded(v=>!v)}>{expanded?'收起 ↙':'展开 ↗'}</button>
    </div>
    <CampaignMinimap state={state} selected={selected} onSelect={select}/>
    <details className="map-legend-toggle"><summary>图例</summary><div className="territory-legend" aria-label="领地与资源图例">
      <span><i style={{background:NEUTRAL_COLOR}}/>未占领</span>
      {state.agents.map(a=><span key={a.id}><i style={{background:a.color}}/>{a.name}</span>)}
      <span className="legend-terrain">禾 农田　◆ 矿场　马 马场</span>
      <small>细线县界 · 粗线郡界</small>
    </div></details>
    {!!state.armies?.length&&<details className="marching-army-list"><summary>战场军队 · {state.armies.length}</summary><div>
      {state.armies.map(a=><button key={a.id} onClick={()=>onSelectArmy?.(a.id)}>
        <b style={{color:state.agents.find(f=>f.id===a.owner)?.color}}>{state.agents.find(f=>f.id===a.owner)?.name} · {formatTroops(a.troops)} 人</b>
        <span>{state.cities[a.route[a.leg]!]!.name} → {state.cities[a.route[a.leg+1]!]!.name} · {Math.round(a.progress*100)}%</span>
        <small>{troopSummary(a)}</small>
        {a.commanderId&&<span>统军：{state.characters?.find(c=>c.id===a.commanderId&&c.owner===a.owner&&!c.capturedBy)?.name??'将领已离队'}</span>}
        <small>{a.stance==='ambush'?'野外设伏':a.stance==='camp'?'驻扎待命':`最终目的地 ${state.cities[a.route.at(-1)!]!.name} · ${a.blockedReason==='terrain'?'停驻：山路不通':a.halted?'停驻：非交战领土':`预计 ${a.remainingTurns??'—'} 回合（不含战斗延误）`}`}</small>
      </button>)}
    </div></details>}
    {showIndex&&<aside className="county-index">
      <input aria-label="搜索郡县" placeholder="搜索县名、郡国或州…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <GameSelect aria-label="选择州" value={province} onChange={e=>setProvince(e.target.value)}><option value="">全部十三州</option>{[...new Set(state.cities.map(c=>c.province))].map(p=><option key={p}>{p}</option>)}</GameSelect>
      <small>找到 {results.length} 处据点</small>
      <div>{results.map(c=><button key={c.id} onClick={()=>{select(c.id);setShowIndex(false);}}><b>{c.name}</b><span>{c.province} · {c.commandery}</span></button>)}</div>
    </aside>}
    {city&&!targeting&&<aside className="county-detail">
      <button className="detail-close" onClick={()=>setSelected(null)} aria-label="关闭县城详情">×</button>
      <small>{city.province} / {city.commandery}</small><h3>{city.name}{city.seat?' · 郡治':''}</h3>
      {Object.values(state.polities??{}).filter(p=>p.kingdom?.capitalId===city.id).map(p=><p className="capital-marker" key={p.kingdom!.name}>♛ {p.kingdom!.name}国首都 · 失守即亡国</p>)}
      <p className="county-owner"><i style={{background:state.agents.find(a=>a.id===city.owner)?.color??NEUTRAL_COLOR}}/>{state.agents.find(a=>a.id===city.owner)?.name??'未占领 · 中立'} · {formatTroops(city.troops)} 人 · {city.level}级</p>
      <p>{troopSummary(city)}</p>
      <p>地形：{resource?RESOURCE_LABELS[resource]:city.terrain==='blocked'?'山地':'平原'}{city.siteKind&&city.siteKind!=='city'?' · 独立资源据点':resource==='horse'?' · 草场地标':city.resourceTrait?' · 资源产地':''}</p>
      {city.siteKind&&city.siteKind!=='city'&&<p>{city.owner?'由占领势力收取':'占领后获得'}：资源收入 +6 / 回合（另计基础税收、维护与军饷）。失守后收益转归新占领者。</p>}
      <details className="county-neighbors"><summary>道路相连 · {city.adjacent.length} 县</summary><div>{city.adjacent.map(id=><button key={id} onClick={()=>setSelected(id)}>{state.cities[id]!.name}</button>)}</div></details>
      {onCityAction&&<CityActions cityId={city.id} owned={city.owner===playerId} playerId={playerId} disabled={commandsDisabled} onAction={onCityAction}/>}
    </aside>}
    <details className="map-source"><summary>地图设置</summary>
      <p>疆域为据点控制区，不代表考订的历史边界。山川与道路为游戏示意。新剧本的农庄、矿场、马场需要分别占领，提供国库收入；暂不单独生产粮食、矿石或战马库存。{state.map!.note}</p>
      <a href="https://zh.wikipedia.org/wiki/东汉行政区划" target="_blank" rel="noreferrer">东汉行政区划名录 · 数据来源</a>
    </details>
  </div>;
}
import {troopSummary} from '../../../api/src/domain/troops';
