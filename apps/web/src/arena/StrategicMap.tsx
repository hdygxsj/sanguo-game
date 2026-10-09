import {formatTroops} from '../../../api/src/domain/troopScale';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { BattleState } from '../types';
import { armyMapPosition } from './armyMap';
import {campaignTerrain} from '../../../api/src/domain/campaignTerrain';
import { mapBounds } from './compactMap';
import { buildTerritories, clampView, countyFill, mapResource, NEUTRAL_COLOR, RESOURCE_LABELS, zoomView, type Point, type ViewBox } from './territories';

const pointsText=(points:Point[])=>points.map(p=>p.join(',')).join(' ');
const pathText=(points:Point[])=>points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' ');
const symbols={farm:'禾',mine:'◆',horse:'马'};

export function StrategicMap({state,selected,onSelect,reset,onSelectArmy,selectedArmyId}:{state:BattleState;selected:number|null;onSelect:(id:number)=>void;reset:number;onSelectArmy?:(id:string)=>void;selectedArmyId?:string|null}){
  const map=state.map!;
  // Geometry is independent of turn, owner, troops and replay. Conquests recolor
  // existing paths rather than rebuilding 1,184 cells or resetting the camera.
  const geometryKey=`${map.id}:${state.cities.map(c=>`${c.id},${c.x},${c.z}`).join(';')}`;
  const territories=useMemo(()=>buildTerritories(state.cities,map.outline),[geometryKey]);
  const full=useMemo(()=>mapBounds(map.outline,.7),[geometryKey]);
  const [view,setView]=useState<ViewBox>(full);
  const [terrain,setTerrain]=useState(true);
  const [resources,setResources]=useState(true);
  const svg=useRef<SVGSVGElement>(null);
  const viewRef=useRef(view);viewRef.current=view;
  const drag=useRef<{x:number;y:number;view:ViewBox;scale:number;distance:number}|null>(null);
  const suppressClick=useRef(false);
  const uid=useId().replace(/:/g,'');
  const clip=`land-${uid}`,field=`field-${uid}`,paper=`paper-${uid}`;
  const colors=useMemo(()=>new Map(state.agents.map(a=>[a.id,a.color])),[state.agents]);
  const byId=useMemo(()=>new Map(state.cities.map(c=>[c.id,c])),[state.cities]);
  const city=selected===null?null:state.cities.find(c=>c.id===selected);
  const level=full.width/view.width;
  const iconSize=view.width*.009;
  const lineWidth=view.width*.001;

  useEffect(()=>{
    if(!city){setView(full);return;}
    const group=mapBounds(state.cities.filter(c=>c.commanderyId===city.commanderyId).map(c=>[c.x,c.z]),.35);
    const width=Math.min(full.width,Math.max(group.width,group.height*full.width/full.height,full.width*.09));
    const height=width*full.height/full.width;
    setView(clampView({x:group.center[0]-width/2,z:group.center[1]-height/2,width,height},full));
  },[selected,geometryKey,reset]);

  useEffect(()=>{
    const element=svg.current;if(!element)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      const rect=element.getBoundingClientRect(),current=viewRef.current;
      const scale=Math.max(current.width/rect.width,current.height/rect.height);
      const anchor:Point=[current.x+current.width/2+(event.clientX-rect.left-rect.width/2)*scale,current.z+current.height/2+(event.clientY-rect.top-rect.height/2)*scale];
      setView(zoomView(current,Math.exp(Math.max(-200,Math.min(200,event.deltaY))*.0025),anchor,full));
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return ()=>element.removeEventListener('wheel',wheel);
  },[full]);
  useEffect(()=>{
    const army=state.armies?.find(a=>a.id===selectedArmyId),p=army?armyMapPosition(army,state.cities,state):null;if(!p)return;
    const width=full.width/7,height=full.height/7;
    setView(clampView({x:p[0]-width/2,z:p[1]-height/2,width,height},full));
  },[selectedArmyId,geometryKey]);

  const resourceNodes=useMemo(()=>{
    const seen=new Set<string>();
    const positions:Point[]=[];
    return [...state.cities].sort((a,b)=>Number(mapResource(b)==='horse')-Number(mapResource(a)==='horse')).flatMap(c=>{
      const kind=mapResource(c);if(!kind)return [];
      if(level<2.5){const key=`${c.commanderyId}:${kind}`;if(seen.has(key))return [];seen.add(key);}
      if(level<2.5&&positions.some(([x,z])=>Math.hypot(x-c.x,z-c.z)<full.width*.025))return [];
      positions.push([c.x,c.z]);
      return [{city:c,kind}];
    });
  },[state.cities,level<2.5]);
  const inView=(x:number,z:number)=>x>view.x&&x<view.x+view.width&&z>view.z&&z<view.z+view.height;
  const labels=useMemo(()=>{
    const candidates=state.cities.filter(c=>inView(c.x,c.z)&&(level>4||(level>1.7&&c.seat)||c.id===selected||c.owner));
    candidates.sort((a,b)=>Number(b.id===selected)-Number(a.id===selected)||Number(!!b.owner)-Number(!!a.owner)||Number(!!b.seat)-Number(!!a.seat));
    const chosen:typeof candidates=[];
    for(const c of candidates){
      if(chosen.every(other=>Math.abs(other.x-c.x)>view.width*.08||Math.abs(other.z-c.z)>view.height*.043))chosen.push(c);
      if(chosen.length>=45)break;
    }
    return chosen;
  },[state.cities,view,selected]);
  const selectedCell=territories.cells.find(c=>c.id===selected);
  const zoom=(factor:number)=>setView(current=>zoomView(current,factor,[current.x+current.width/2,current.z+current.height/2],full));

  return <>
    <svg ref={svg} className="strategic-map" aria-label="郡县疆域战略地图" viewBox={`${view.x} ${view.z} ${view.width} ${view.height}`} tabIndex={0}
      onKeyDown={e=>{
        if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.75);}
        else if(e.key==='-'){e.preventDefault();zoom(1.3);}
        else if(e.key==='Escape')onSelect(-1);
        else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
          e.preventDefault();setView(v=>clampView({...v,x:v.x+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0)*v.width,z:v.z+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0)*v.height},full));
        }
      }}
      onPointerDown={e=>{
        if(e.button!==0)return;
        const rect=e.currentTarget.getBoundingClientRect();
        drag.current={x:e.clientX,y:e.clientY,view,scale:Math.max(view.width/rect.width,view.height/rect.height),distance:0};
        suppressClick.current=false;
      }}
      onPointerMove={e=>{
        const d=drag.current;if(!d)return;
        const dx=e.clientX-d.x,dy=e.clientY-d.y;d.distance=Math.hypot(dx,dy);
        if(d.distance>4){suppressClick.current=true;e.currentTarget.setPointerCapture?.(e.pointerId);setView(clampView({...d.view,x:d.view.x-dx*d.scale,z:d.view.z-dy*d.scale},full));}
      }}
      onPointerUp={()=>{drag.current=null;}}
      onPointerCancel={()=>{drag.current=null;suppressClick.current=true;}}
      onLostPointerCapture={()=>{drag.current=null;}}>
      <defs>
        <clipPath id={clip}><polygon points={pointsText(map.outline)}/></clipPath>
        <pattern id={field} width={iconSize*1.8} height={iconSize*1.8} patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d={`M0 0V${iconSize*1.8} M${iconSize*.9} 0V${iconSize*1.8}`} stroke="#647446" strokeWidth={iconSize*.12} opacity=".4"/></pattern>
        <pattern id={paper} width=".32" height=".32" patternUnits="userSpaceOnUse"><circle cx=".08" cy=".1" r=".006" fill="#333c2e" opacity=".22"/><circle cx=".24" cy=".25" r=".009" fill="#f4e7c8" opacity=".22"/></pattern>
      </defs>
      <polygon points={pointsText(map.outline)} fill="#adb395" stroke="#bcb392" strokeWidth=".14"/>
      <g clipPath={`url(#${clip})`}>
        <g data-layer="counties">
          {territories.cells.map(cell=>{
            const c=byId.get(cell.id)!;
            return <polygon key={cell.id} data-county-id={cell.id} data-owner={c.owner??'neutral'} points={pointsText(cell.points)} fill={countyFill(c,colors)} fillOpacity={c.owner?.83:.75}
              stroke={c.owner?colors.get(c.owner):'#777961'} strokeWidth={c.owner?1.6:level<2?.4:.65} vectorEffect="non-scaling-stroke"
              onClick={()=>{if(!suppressClick.current)onSelect(c.id);}} className="county-territory">
              <title>{c.province} / {c.commandery} / {c.name} · {c.owner?state.agents.find(a=>a.id===c.owner)?.name:'未占领'}{mapResource(c)?` · ${RESOURCE_LABELS[mapResource(c)!]}`:''}</title>
            </polygon>;
          })}
        </g>
        <g pointerEvents="none">
          <polygon points={pointsText(map.outline)} fill={`url(#${paper})`}/>
          {terrain&&<g data-layer="terrain-fields">{territories.cells.filter(c=>state.cities[c.id]?.terrain==='farmland').map(c=><polygon key={c.id} points={pointsText(c.points)} fill={`url(#${field})`}/>)}</g>}
          <path data-layer="commandery-borders" d={territories.commanderyBorders.map(pathText).join(' ')} fill="none" stroke="#454d3c" strokeWidth={level<2?1:1.5} vectorEffect="non-scaling-stroke" opacity=".8"/>
          {terrain&&<g data-layer="mountains">{map.ranges.map(range=><g key={range.name}>
            <path d={pathText(range.points)} fill="none" stroke="#536852" strokeWidth=".55" strokeLinecap="round" opacity=".18"/>
            {range.points.map(([x,z],i)=><g key={i} transform={`translate(${x} ${z}) scale(${map.id.endsWith('-compact')?.52:1})`}>
              <path d="M-.46 .23 Q-.24 -.05 -.12 -.34 Q.03 -.08 .16 .03 L.33 -.2 .54 .28" fill="#74806a" fillOpacity=".65" stroke="#465944" strokeWidth=".025"/>
              <path d="M-.12 -.34 L-.04 .09 .16 .03 M.33 -.2 .38 .12 M-.35 .3 Q0 .19 .49 .34 M-.44 .38 Q0 .28 .56 .4" fill="none" stroke="#445841" strokeWidth=".02" opacity=".75"/>
            </g>)}
            {level<3&&<text x={range.points[Math.floor(range.points.length/2)]![0]} y={range.points[Math.floor(range.points.length/2)]![1]+.36} className="terrain-name" fontSize={full.width*.01}>{range.name}</text>}
          </g>)}</g>}
          <g data-layer="rivers">{map.rivers.map((r,i)=><g key={r.name}>
            <path id={`river-${uid}-${i}`} d={pathText(r.points)} fill="none" stroke="#d3dcc0" strokeWidth={lineWidth*3.8} strokeLinejoin="round"/>
            <path d={pathText(r.points)} fill="none" stroke="#477d87" strokeWidth={lineWidth*2.1} strokeLinejoin="round"/>
            {level<3&&<text fill="#2f626c" fontSize={full.width*.012} dy={-full.width*.004}><textPath href={`#river-${uid}-${i}`} startOffset="45%">{r.name}</textPath></text>}
          </g>)}</g>
          {selectedCell&&<polygon points={pointsText(selectedCell.points)} fill="#fff0b5" fillOpacity=".22" stroke="#ffdf83" strokeWidth="3" vectorEffect="non-scaling-stroke"/>}
          {city&&<g data-layer="roads">{city.adjacent.map(id=>{const road=campaignTerrain(state).road(city.id,id);return road?<path key={id} d={pathText(road.points)} fill="none" stroke="#593f29" strokeWidth="1.3" vectorEffect="non-scaling-stroke"/>:null;})}</g>}
          {state.cities.filter(c=>c.seat||c.owner||level>3).map(c=><circle key={c.id} cx={c.x} cy={c.z} r={iconSize*(c.owner?.65:.35)} fill={c.owner?colors.get(c.owner):'#555843'} stroke="#efe2bd" strokeWidth={iconSize*.15}/>)}
          {resources&&<g data-layer="resources">{resourceNodes.filter(({city:c})=>inView(c.x,c.z)).map(({city:c,kind})=><g key={c.id} data-resource={kind} transform={`translate(${c.x+iconSize*1.4} ${c.z-iconSize*1.6})`}>
            <circle r={iconSize} fill={kind==='farm'?'#596b40':kind==='mine'?'#525553':'#8a6438'} stroke="#e6d6ab" strokeWidth={iconSize*.12}/>
            <text fill="#f5e7bf" fontSize={iconSize*1.35} textAnchor="middle" dominantBaseline="central">{symbols[kind]}</text>
            <title>{c.name} · {RESOURCE_LABELS[kind]}</title>
          </g>)}</g>}
          {level<2&&map.regions.map(r=><text key={r.name} x={r.point[0]} y={r.point[1]} fontSize={view.width*.028} className="state-name">{r.name}</text>)}
          {labels.map(c=><text key={c.id} x={c.x} y={c.z+iconSize*2.7} fontSize={iconSize*1.5} style={{strokeWidth:iconSize*.2}} className={`territory-name ${c.owner?'owned':''}`}>{level>3?c.name:c.commandery}{c.owner?` · ${formatTroops(c.troops)}`:''}</text>)}
        </g>
      </g>
      <polygon points={pointsText(map.outline)} fill="none" stroke="#d0c49e" strokeWidth="1.4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
      <g data-layer="marching-armies">{(state.armies??[]).map(a=>{
        const p=armyMapPosition(a,state.cities,state);if(!p)return null;
        return <g key={a.id} role="button" tabIndex={0} aria-label={`选择军队 ${a.name??a.id}`} transform={`translate(${p[0]} ${p[1]})`} onClick={()=>{if(!suppressClick.current)onSelectArmy?.(a.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onSelectArmy?.(a.id);}}}>
          <circle r={iconSize*2} fill="transparent" stroke={a.id===selectedArmyId?'#f4e3ae':'none'} strokeWidth={iconSize*.2}/>
          <path d={`M0 0v${-iconSize*3}l${iconSize*2} ${iconSize*.5}l${-iconSize*2} ${iconSize*.5}`} stroke="#efe4c9" strokeWidth={iconSize*.2} fill={colors.get(a.owner)}/>
          <title>{formatTroops(a.troops)} 人 · 预计 {a.remainingTurns??'—'} 回合抵达</title>
        </g>;
      })}</g>
    </svg>
    <div className="strategy-layers" aria-label="地图图层">
      <button aria-pressed={terrain} onClick={()=>setTerrain(v=>!v)}>山川地形</button>
      <button aria-pressed={resources} onClick={()=>setResources(v=>!v)}>资源地标</button>
    </div>
    <div className="strategy-navigation">
      <div className="map-zoom"><button aria-label="放大地图" onClick={()=>zoom(.72)}>＋</button><span>{level.toFixed(1)}×</span><button aria-label="缩小地图" onClick={()=>zoom(1.4)}>−</button><button aria-label="重置地图视角" onClick={()=>setView(full)}>全图</button></div>
      {level>1.2&&<svg className="strategy-minimap" viewBox={`${full.x} ${full.z} ${full.width} ${full.height}`} aria-label="全境缩略图" onClick={()=>setView(full)}>
        <defs><clipPath id={`mini-${clip}`}><polygon points={pointsText(map.outline)}/></clipPath></defs>
        <polygon points={pointsText(map.outline)} fill={NEUTRAL_COLOR}/>
        <g clipPath={`url(#mini-${clip})`}>
          <path d={territories.commanderyBorders.map(pathText).join(' ')} stroke="#56604d" strokeWidth={full.width*.002} fill="none"/>
          {territories.cells.filter(cell=>byId.get(cell.id)?.owner).map(cell=><polygon key={cell.id} points={pointsText(cell.points)} fill={colors.get(byId.get(cell.id)!.owner!)}/>)}
        </g>
        <rect x={view.x} y={view.z} width={view.width} height={view.height} fill="none" stroke="#f5d689" strokeWidth={full.width*.013}/>
      </svg>}
    </div>
  </>;
}
