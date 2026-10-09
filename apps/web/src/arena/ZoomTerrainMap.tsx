import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree,type ThreeEvent } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BattleState, CityState } from '../types';
import { createTerrainField, type TerrainField } from './terrainField';
import { createMapAtlas } from './terrainAtlas';
import { buildTerritories, mapResource } from './territories';
import { DEFAULT_MAP_TRANSITION as CONFIG, nearestCounty, transitionAt } from './mapTransition';
import { ARENA_MODEL_URL, ARENA_DRACO_DECODER_PATH, buildingForCity } from './arenaLogic';
import { StrategicMap } from './StrategicMap';
import { fadeCounty,refreshInstanceBounds,retainLodSlots } from './mapLod';
import { createTerrainDetails,injectLandDetail,chooseFarmAnchor,farmPoint } from './terrainDetail';
import { armyMapPosition } from './armyMap';
import { bakeForestGeometry, FOREST_MODEL_URL, forestAppearance } from './forestGeometry';
import { createBuildingSites,createFoundationGeometry } from './buildingFoundation';
import {bakeHorseGeometry,HORSE_MODEL_URL} from './horseGeometry';
import {bakeRockGeometry,ROCK_MODEL_URL} from './rockGeometry';
import {bakeInfantryGeometry,INFANTRY_MODEL_URL,ARCHER_MODEL_URL,SWORD_MODEL_URL,CAVALRY_MODEL_URL} from './infantryGeometry';
import {garrisonUnitSlots} from './garrisonComposition';
import {garrisonSlots} from './garrisonPlacement';
import {forestPositions} from './forestPlacement';
import {marchingFormation} from './marchingFormation';
import {WebGLGuard} from './WebGLGuard';
import {mapCameraView} from './mapCamera';
import {mapNeedsFrame} from './mapFrame';
import {createTerrainSurface,surfaceUsesOverview} from './terrainSurface';
import {campaignTerrain} from '../../../api/src/domain/campaignTerrain';

type Props={state:BattleState;selected:number|null;onSelect:(id:number)=>void;reset:number;onSelectArmy?:(id:string)=>void;selectedArmyId?:string|null};
type Runtime={zoom:number;desired:number;target:THREE.Vector3;weights:ReturnType<typeof transitionAt>;ready:boolean;modelOpacity:number;near:CityState[];cityAlpha:Map<number,number>;focus:number|null;armyFocus:string|null;reset:number;command:number;drawCalls:number;triangles:number;requestFrame?:()=>void};
type Shared={state:BattleState;field:TerrainField;runtime:Runtime;sites:ReturnType<typeof createBuildingSites>};
const dummy=new THREE.Object3D();
const noRaycast=()=>{};

class MapBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function CameraRig({state,field,runtime,onMetrics}:{onMetrics:(zoom:number)=>void}&Shared){
  const {camera:raw,size,gl,invalidate}=useThree();const camera=raw as THREE.OrthographicCamera;
  useEffect(()=>{runtime.requestFrame=invalidate;return()=>{runtime.requestFrame=undefined;};},[runtime,invalidate]);
  const focus=useRef(new THREE.Vector3(...[field.bounds.center[0],0,field.bounds.center[1]] as [number,number,number]));
  const oldReset=useRef(-1),oldFocus=useRef<number|null>(null),elapsed=useRef(0);
  const oldArmyFocus=useRef<string|null>(null);
  const zoomAnchor=useRef<{world:THREE.Vector3;ndc:THREE.Vector2}|null>(null);
  useEffect(()=>{
    const element=gl.domElement,ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const project=(x:number,y:number)=>{
      const rect=element.getBoundingClientRect(),ndc=new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
      ray.setFromCamera(ndc,camera);const world=new THREE.Vector3();plane.constant=-field.height(runtime.target.x,runtime.target.z)*runtime.weights.relief;
      return ray.ray.intersectPlane(plane,world)?{world,ndc}:null;
    };
    let drag:{x:number;y:number;point:THREE.Vector3}|null=null;
    const wheel=(event:WheelEvent)=>{event.preventDefault();zoomAnchor.current=project(event.clientX,event.clientY);runtime.desired=THREE.MathUtils.clamp(runtime.desired*Math.exp(-event.deltaY*.0015),1,CONFIG.maxZoom);invalidate();};
    const down=(event:PointerEvent)=>{if(event.button!==0&&event.button!==2)return;const p=project(event.clientX,event.clientY);if(p)drag={x:event.clientX,y:event.clientY,point:p.world};zoomAnchor.current=null;};
    const move=(event:PointerEvent)=>{if(!drag||!event.buttons)return;const p=project(event.clientX,event.clientY);if(p){runtime.target.x+=drag.point.x-p.world.x;runtime.target.z+=drag.point.z-p.world.z;focus.current.copy(runtime.target);invalidate();}};
    const up=()=>{drag=null;};const menu=(e:Event)=>e.preventDefault();
    element.addEventListener('wheel',wheel,{passive:false});element.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);element.addEventListener('contextmenu',menu);
    return()=>{element.removeEventListener('wheel',wheel);element.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);element.removeEventListener('contextmenu',menu);};
  },[camera,field,gl,runtime,invalidate]);
  useFrame((_,dt)=>{
    // Demand mode can wake after minutes: do not jump to the final zoom on that first frame.
    dt=Math.min(dt,.05);
    gl.domElement.dataset.renderFrames=String(Number(gl.domElement.dataset.renderFrames??0)+1);
    if(oldReset.current!==runtime.reset){oldReset.current=runtime.reset;runtime.desired=1;runtime.target.set(field.bounds.center[0],0,field.bounds.center[1]);focus.current.copy(runtime.target);zoomAnchor.current=null;}
    if(oldFocus.current!==runtime.focus){oldFocus.current=runtime.focus;const c=state.cities.find(c=>c.id===runtime.focus);if(c){focus.current.set(c.x,0,c.z);runtime.desired=Math.max(runtime.desired,7);zoomAnchor.current=null;}}
    if(oldArmyFocus.current!==runtime.armyFocus){oldArmyFocus.current=runtime.armyFocus;const a=state.armies?.find(a=>a.id===runtime.armyFocus),p=a?armyMapPosition(a,state.cities,state):null;if(p){focus.current.set(p[0],0,p[1]);runtime.desired=Math.max(runtime.desired,7);zoomAnchor.current=null;}}
    runtime.target.lerp(focus.current,1-Math.exp(-dt*7));
    runtime.zoom=THREE.MathUtils.damp(runtime.zoom,runtime.desired,10,dt);runtime.weights=transitionAt(runtime.zoom);
    runtime.modelOpacity=THREE.MathUtils.damp(runtime.modelOpacity,runtime.ready?runtime.weights.models:0,9,dt);
    const view=mapCameraView(runtime.zoom,field.bounds.width,field.bounds.height,size.width,size.height);
    const update=()=>{runtime.target.y=field.height(runtime.target.x,runtime.target.z)*runtime.weights.relief;camera.position.set(runtime.target.x+view.offset[0],runtime.target.y+view.offset[1],runtime.target.z+view.offset[2]);camera.up.set(0,1,0);camera.lookAt(runtime.target);camera.zoom=view.scale;camera.updateProjectionMatrix();camera.updateMatrixWorld();};
    update();
    if(zoomAnchor.current&&Math.abs(runtime.zoom-runtime.desired)>.0001){
      const ray=new THREE.Raycaster();ray.setFromCamera(zoomAnchor.current.ndc,camera);const point=new THREE.Vector3();
      if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-zoomAnchor.current.world.y),point)){
        runtime.target.x+=zoomAnchor.current.world.x-point.x;runtime.target.z+=zoomAnchor.current.world.z-point.z;focus.current.copy(runtime.target);update();
      }
    }
    elapsed.current+=dt;if(elapsed.current>.15||runtime.drawCalls!==gl.info.render.calls||runtime.triangles!==gl.info.render.triangles){elapsed.current=0;runtime.drawCalls=gl.info.render.calls;runtime.triangles=gl.info.render.triangles;onMetrics(runtime.zoom);}
    if(mapNeedsFrame({zoom:runtime.zoom,desired:runtime.desired,focusDistance:Math.hypot(runtime.target.x-focus.current.x,runtime.target.z-focus.current.z),modelOpacity:runtime.modelOpacity,modelTarget:runtime.ready?runtime.weights.models:0,lodFading:[...runtime.cityAlpha.values()].some(a=>a>.005&&a<.999)}))invalidate();
  },-2);
  return null;
}

function Surface({state,field,runtime,onSelect,selected}:Shared&Pick<Props,'onSelect'|'selected'>){
  const geometry=useMemo(()=>createTerrainSurface(field,false),[field]);
  const overviewGeometry=useMemo(()=>createTerrainSurface(field,true),[field]);
  useEffect(()=>()=>overviewGeometry.dispose(),[overviewGeometry]);
  const territories=useMemo(()=>buildTerritories(state.cities,state.map!.outline),[field]);
  const natural=useMemo(()=>createMapAtlas(state,field,territories,false),[field,territories]);
  const political=useMemo(()=>createMapAtlas(state,field,territories,true),[state,field,territories]);
  const uniforms=useMemo(()=>({politicalMap:{value:political},politicalWeight:{value:1},detailWeight:{value:0}}),[]);
  uniforms.politicalMap.value=political;
  const material=useMemo(()=>{
    const m=new THREE.MeshStandardMaterial({map:natural,roughness:1,metalness:0,alphaTest:.4});
    m.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      injectLandDetail(shader);
      shader.fragmentShader='uniform sampler2D politicalMap;\nuniform float politicalWeight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec3 territory = texture2D(politicalMap, vMapUv).rgb;
        outgoingLight = mix(outgoingLight, territory, politicalWeight * .94);
        #include <opaque_fragment>`);
    };
    m.customProgramCacheKey=()=> 'han-world-detail-v3';return m;
  },[natural,uniforms]);
  const mesh=useRef<THREE.Mesh>(null),highlight=useRef<THREE.LineLoop>(null);
  const detailMesh=useRef<THREE.Mesh>(null),borderLines=useRef<THREE.LineSegments>(null);
  const detailGeometry=useMemo(()=>createTerrainDetails(state,field),[field]);
  const borderGeometry=useMemo(()=>{
    const points:THREE.Vector3[]=[];
    for(const [a,b] of territories.commanderyBorders){if(!a||!b)continue;const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025));
      for(let i=0;i<steps;i++){const x=a[0]+(b[0]-a[0])*(i+.5)/steps,z=a[1]+(b[1]-a[1])*(i+.5)/steps;if(!field.contains(x,z))continue;for(const t of [i/steps,(i+1)/steps]){const xx=a[0]+(b[0]-a[0])*t,zz=a[1]+(b[1]-a[1])*t;points.push(new THREE.Vector3(xx,field.height(xx,zz)+.007,zz));}}
    }return new THREE.BufferGeometry().setFromPoints(points);
  },[territories,field]);
  useEffect(()=>()=>{detailGeometry.dispose();borderGeometry.dispose();},[detailGeometry,borderGeometry]);
  const selectedGeometry=useMemo(()=>{
    const cell=territories.cells.find(c=>c.id===selected);if(!cell)return null;
    return new THREE.BufferGeometry().setFromPoints(cell.points.map(([x,z])=>new THREE.Vector3(x,field.height(x,z)+.012,z)));
  },[territories,selected,field]);
  useEffect(()=>()=>{geometry.dispose();natural.dispose();material.dispose();},[geometry,natural,material]);
  useEffect(()=>()=>political.dispose(),[political]);useEffect(()=>()=>selectedGeometry?.dispose(),[selectedGeometry]);
  useFrame(()=>{if(mesh.current){mesh.current.geometry=surfaceUsesOverview(runtime.zoom)?overviewGeometry:geometry;mesh.current.scale.y=runtime.weights.relief;}uniforms.politicalWeight.value=runtime.weights.political;uniforms.detailWeight.value=runtime.weights.detail;if(highlight.current)highlight.current.scale.y=runtime.weights.relief;
    if(detailMesh.current){detailMesh.current.scale.y=runtime.weights.relief;detailMesh.current.visible=runtime.weights.detail>.001;(detailMesh.current.material as THREE.MeshStandardMaterial).opacity=runtime.weights.detail;}
    if(borderLines.current){borderLines.current.scale.y=runtime.weights.relief;borderLines.current.visible=runtime.weights.detail>.001;(borderLines.current.material as THREE.LineBasicMaterial).opacity=runtime.weights.detail*.24;}
  });
  return <>
    <mesh ref={mesh} geometry={geometry} material={material} receiveShadow onClick={e=>{if(e.delta>5)return;e.stopPropagation();if(field.contains(e.point.x,e.point.z))onSelect(nearestCounty(state.cities,e.point.x,e.point.z));}}/>
    <mesh ref={detailMesh} geometry={detailGeometry} raycast={noRaycast} receiveShadow><meshStandardMaterial vertexColors roughness={.92} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></mesh>
    <lineSegments ref={borderLines} geometry={borderGeometry} raycast={noRaycast}><lineBasicMaterial color="#736d52" transparent depthWrite={false}/></lineSegments>
    {selectedGeometry&&<lineLoop ref={highlight} geometry={selectedGeometry} raycast={noRaycast}><lineBasicMaterial color="#f0d896" transparent opacity={.9} depthTest={false}/></lineLoop>}
    <mesh rotation={[-Math.PI/2,0,0]} position={[field.bounds.center[0],-.045,field.bounds.center[1]]} raycast={noRaycast}><planeGeometry args={[field.bounds.width*6,field.bounds.height*6]}/><meshBasicMaterial color="#a4b7b4"/></mesh>
  </>;
}

function CitySymbols({state,field,runtime,sites,onSelect}:Shared&Pick<Props,'onSelect'>){
  const ref=useRef<THREE.InstancedMesh>(null);const {camera}=useThree();
  const geometry=useMemo(()=>{const g=new THREE.CircleGeometry(1,12);g.setAttribute('instanceFade',new THREE.InstancedBufferAttribute(new Float32Array(state.cities.length).fill(1),1));return g;},[state.cities.length]);
  const material=useMemo(()=>{
    const m=new THREE.MeshBasicMaterial({color:'#f2e5c4',transparent:true,depthTest:false});
    m.onBeforeCompile=s=>{s.vertexShader='attribute float instanceFade; varying float symbolFade;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsymbolFade=instanceFade;');s.fragmentShader='varying float symbolFade;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= symbolFade;\n#include <opaque_fragment>');};return m;
  },[]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useEffect(()=>{const mesh=ref.current;if(!mesh)return;state.cities.forEach((city,i)=>mesh.setColorAt(i,new THREE.Color(city.owner?state.agents.find(a=>a.id===city.owner)?.color??'#ece1c5':'#eee2c2')));if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;},[state]);
  useFrame(()=>{
    if(!ref.current)return;const active=new Set(runtime.near.map(c=>c.id));const fades=geometry.getAttribute('instanceFade');
    state.cities.forEach((city,i)=>{
      const fade=active.has(city.id)?1-runtime.modelOpacity*(runtime.cityAlpha.get(city.id)??0):1;fades.setX(i,fade);
      dummy.position.set(city.x,sites.get(city.id)!.top*runtime.weights.relief+.025,city.z);dummy.quaternion.copy(camera.quaternion);
      const size=(city.seat?.035:.016)/Math.sqrt(Math.max(1,runtime.zoom*.5));dummy.scale.setScalar(size);dummy.updateMatrix();ref.current!.setMatrixAt(i,dummy.matrix);
    });fades.needsUpdate=true;refreshInstanceBounds(ref.current);
    ref.current.raycast=function(raycaster,hits){const candidates:THREE.Intersection[]=[];THREE.InstancedMesh.prototype.raycast.call(this,raycaster,candidates);for(const hit of candidates)if(fades.getX(hit.instanceId??0)>.12)hits.push(hit);};
  });
  return <instancedMesh ref={ref} args={[geometry,material,state.cities.length]} frustumCulled={false} renderOrder={4} onClick={e=>{const c=state.cities[e.instanceId??-1];if(!c||e.delta>5)return;e.stopPropagation();onSelect(c.id);}}/>;
}

type ModelPart={geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial;root:string};
function Buildings({state,field,runtime,sites,onSelect}:Shared&Pick<Props,'onSelect'>){
  const {scene}=useGLTF(ARENA_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const refs=useRef<(THREE.InstancedMesh|null)[]>([]);
  const parts=useMemo(()=>{
    const result:ModelPart[]=[];scene.updateMatrixWorld(true);
    for(const root of scene.children){
      const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=1/Math.max(size.x,size.z);
      root.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);
        const source=Array.isArray(node.material)?node.material[0]:node.material;const material=source.clone() as THREE.MeshStandardMaterial;material.roughness=.95;material.metalness=0;material.transparent=true;material.depthWrite=true;
        const hsl={h:0,s:0,l:0};material.color.getHSL(hsl);material.color.setHSL(hsl.h,hsl.s*.6,hsl.l*.9);
        if(/jade|tile|glaze/i.test(source.name))material.color.set('#626b67');
        geometry.setAttribute('cityOpacity',new THREE.InstancedBufferAttribute(new Float32Array(CONFIG.maxCities*2),1));
        material.onBeforeCompile=s=>{s.vertexShader='attribute float cityOpacity; varying float lodOpacity;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlodOpacity=cityOpacity;');s.fragmentShader='varying float lodOpacity;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= lodOpacity;\n#include <opaque_fragment>');};
        result.push({geometry,material,root:root.name});});
    }
    const foundationGeometry=createFoundationGeometry();
    foundationGeometry.setAttribute('cityOpacity',new THREE.InstancedBufferAttribute(new Float32Array(CONFIG.maxCities*2),1));
    const foundationMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true});
    foundationMaterial.onBeforeCompile=result[0]!.material.onBeforeCompile;
    result.push({root:'foundation',geometry:foundationGeometry,material:foundationMaterial});
    return result;
  },[scene]);
  const clock=useRef(1);
  const wanted=useRef(new Set<number>());
  useEffect(()=>{runtime.ready=true;return()=>{runtime.ready=false;parts.forEach(p=>{p.geometry.dispose();p.material.dispose();});};},[parts,runtime]);
  useFrame((_,dt)=>{
    clock.current+=dt;
    if(clock.current>.15&&runtime.weights.models>.0001){clock.current=0;const next=[...state.cities].sort((a,b)=>(a.x-runtime.target.x)**2+(a.z-runtime.target.z)**2-(b.x-runtime.target.x)**2-(b.z-runtime.target.z)**2).slice(0,CONFIG.maxCities);wanted.current=new Set(next.map(c=>c.id));runtime.near=retainLodSlots(runtime.near,next,runtime.cityAlpha,CONFIG.maxCities*2);}
    for(const c of runtime.near)runtime.cityAlpha.set(c.id,fadeCounty(runtime.cityAlpha.get(c.id)??0,wanted.current.has(c.id),dt));
    const opacity=runtime.modelOpacity;
    parts.forEach((part,i)=>{
      const mesh=refs.current[i];if(!mesh)return;mesh.visible=opacity>.003;mesh.castShadow=runtime.weights.shadows>.1;part.material.opacity=opacity;
      mesh.raycast=opacity>.12?function(this:THREE.InstancedMesh,raycaster,hits){const candidates:THREE.Intersection[]=[];THREE.InstancedMesh.prototype.raycast.call(this,raycaster,candidates);for(const hit of candidates){const c=(this.userData.cities as CityState[])[hit.instanceId??-1];if(c&&(runtime.cityAlpha.get(c.id)??0)*opacity>.12)hits.push(hit);}}:noRaycast;
      if(!mesh.visible)return;
      const cities=runtime.near.filter(c=>part.root==='foundation'||buildingForCity(c)===part.root);mesh.userData.cities=cities;mesh.count=cities.length;
      const fades=part.geometry.getAttribute('cityOpacity');cities.forEach((city,j)=>{const site=sites.get(city.id)!;fades.setX(j,runtime.cityAlpha.get(city.id)??0);dummy.position.set(city.x,site.top*runtime.weights.relief,city.z);dummy.rotation.set(0,city.id%4*Math.PI/2,0);dummy.scale.setScalar(site.width);if(part.root==='foundation')dummy.scale.y=(site.top-site.bottom)*runtime.weights.relief;dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);});fades.needsUpdate=true;refreshInstanceBounds(mesh);
    });
  },-1);
  return <>{parts.map((part,i)=><instancedMesh key={i} ref={node=>{refs.current[i]=node;}} args={[part.geometry,part.material,CONFIG.maxCities*2]} frustumCulled={false} receiveShadow onClick={e=>{if(e.delta>5||runtime.modelOpacity<.12)return;const c=(e.object.userData.cities as CityState[])[e.instanceId??-1];if(c){e.stopPropagation();onSelect(c.id);}}}/>)}</>;
}

function LandscapeDetails({state,field,runtime,sites,onSelect,onSelectArmy}:Shared&Pick<Props,'onSelect'|'onSelectArmy'>){
  const roadWorld=useMemo(()=>campaignTerrain(state),[field]);
  const [preparedWorld,setPreparedWorld]=useState<typeof roadWorld|null>(null);
  const roadsReady=preparedWorld===roadWorld;
  useEffect(()=>{
    const edges=roadWorld.cities.flatMap(c=>c.adjacent.filter(id=>id>c.id).map(id=>[c.id,id] as const));
    let cursor=0,cancelled=false,timer:ReturnType<typeof setTimeout>;
    const prepare=()=>{
      if(cancelled)return;
      const deadline=performance.now()+8;
      do{const pair=edges[cursor++];if(pair)roadWorld.road(...pair);}while(cursor<edges.length&&performance.now()<deadline);
      if(cursor<edges.length)timer=setTimeout(prepare,0);else setPreparedWorld(roadWorld);
    };
    timer=setTimeout(prepare,0);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[roadWorld]);
  const unitTargets=useRef<Record<string,(number|string)[]>>({});
  const selectUnit=(unit:string)=>(event:ThreeEvent<MouseEvent>)=>{
    if(event.delta>5||runtime.modelOpacity<=.12)return;
    const destination=unitTargets.current[unit]?.[event.instanceId??-1];
    if(destination!==undefined){event.stopPropagation();if(typeof destination==='string')onSelectArmy?.(destination);else onSelect(destination);}
  };
  const unitRaycast:THREE.InstancedMesh['raycast']=function(this:THREE.InstancedMesh,ray,hits){
    if(this.visible&&runtime.modelOpacity>.12)THREE.InstancedMesh.prototype.raycast.call(this,ray,hits);
  };
  const garrisons=useMemo(()=>{
    const towns=state.cities.map(c=>({...c,width:sites.get(c.id)!.width}));
    const segments=state.map!.rivers.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i]!,b})));
    const water=(x:number,z:number)=>segments.some(({a,b})=>{
      const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
      return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<.04;
    });
    return new Map(towns.map(c=>[c.id,garrisonSlots(c,field,water,towns)]));
  },[field,sites]);
  const forest=useRef<THREE.InstancedMesh>(null),rocks=useRef<THREE.InstancedMesh>(null),flags=useRef<THREE.InstancedMesh>(null),troops=useRef<THREE.InstancedMesh>(null);
  const road=useRef<THREE.LineSegments>(null);
  const archers=useRef<THREE.InstancedMesh>(null);
  const swords=useRef<THREE.InstancedMesh>(null);
  const cavalry=useRef<THREE.InstancedMesh>(null);
  const horses=useRef<THREE.InstancedMesh>(null),fences=useRef<THREE.InstancedMesh>(null);
  const {scene:forestScene}=useGLTF(FOREST_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const foliageGeometry=useMemo(()=>bakeForestGeometry(forestScene),[forestScene]);
  useEffect(()=>()=>foliageGeometry.dispose(),[foliageGeometry]);
  const {scene:horseScene}=useGLTF(HORSE_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const {scene:infantryScene}=useGLTF(INFANTRY_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const infantryGeometry=useMemo(()=>bakeInfantryGeometry(infantryScene),[infantryScene]);
  const {scene:archerScene}=useGLTF(ARCHER_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const archerGeometry=useMemo(()=>bakeInfantryGeometry(archerScene,2*1.73/2.58),[archerScene]);
  useEffect(()=>()=>archerGeometry.dispose(),[archerGeometry]);
  const {scene:swordScene}=useGLTF(SWORD_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const swordGeometry=useMemo(()=>bakeInfantryGeometry(swordScene,2*1.73/2.58),[swordScene]);
  useEffect(()=>()=>swordGeometry.dispose(),[swordGeometry]);
  const {scene:cavalryScene}=useGLTF(CAVALRY_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const cavalryGeometry=useMemo(()=>bakeInfantryGeometry(cavalryScene,2*3.23/2.58),[cavalryScene]);
  useEffect(()=>()=>cavalryGeometry.dispose(),[cavalryGeometry]);
  useEffect(()=>()=>infantryGeometry.dispose(),[infantryGeometry]);
  const horseGeometry=useMemo(()=>bakeHorseGeometry(horseScene),[horseScene]);
  useEffect(()=>()=>horseGeometry.dispose(),[horseGeometry]);
  const {scene:rockScene}=useGLTF(ROCK_MODEL_URL,ARENA_DRACO_DECODER_PATH);
  const rockGeometry=useMemo(()=>bakeRockGeometry(rockScene),[rockScene]);
  useEffect(()=>()=>rockGeometry.dispose(),[rockGeometry]);
  const trees=useMemo(()=>{
    if(!roadsReady)return [];
    const towns=state.cities.map(c=>({...c,width:sites.get(c.id)!.width}));
    const clearings=towns.map(c=>({x:c.x,z:c.z,radius:c.width*.72+.02}));
    const corridors=state.map!.rivers.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i]!,b,width:.048})));
    const water=(x:number,z:number)=>corridors.some(({a,b})=>{
      const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
      return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<.04;
    });
    for(const c of towns)if(mapResource(c)==='farm'){
      const anchor=chooseFarmAnchor(c,field,water,towns);
      if(anchor){const [x,z]=farmPoint(anchor,.5,.5);clearings.push({x,z,radius:.07});}
    }
    for(const slots of garrisons.values())for(const p of slots)clearings.push({x:p.x,z:p.z,radius:.02});
    for(const c of towns){const kind=mapResource(c);if(kind==='horse'||kind==='mine')clearings.push({x:c.x+.065,z:c.z+.05,radius:.055});}
    const byId=new Map(towns.map(c=>[c.id,c]));
    for(const c of towns)for(const id of c.adjacent){const b=byId.get(id);if(b&&b.id>c.id){const path=campaignTerrain(state).road(c.id,b.id);path?.points.slice(1).forEach((p,i)=>corridors.push({a:path.points[i]!,b:p,width:.016}));}}
    return forestPositions(field,clearings,corridors);
  },[field,sites,garrisons,roadsReady]);
  const roads=useMemo(()=>{
    if(!roadsReady)return new THREE.BufferGeometry();
    const points:THREE.Vector3[]=[];for(const a of state.cities)for(const id of a.adjacent){const b=state.cities.find(c=>c.id===id);if(!b||b.id<a.id)continue;
      const path=campaignTerrain(state).road(a.id,b.id);if(!path)continue;
      for(let i=1;i<path.points.length;i++)for(const [x,z] of [path.points[i-1]!,path.points[i]!])points.push(new THREE.Vector3(x,field.height(x,z)+.008,z));}
    return new THREE.BufferGeometry().setFromPoints(points);
  },[field,roadsReady]);
  useEffect(()=>()=>roads.dispose(),[roads]);
  useFrame(()=>{
    const w=runtime.weights,visible=runtime.modelOpacity>.005;
    const set=(mesh:THREE.InstancedMesh|null,positions:{x:number;y:number;z:number;size:number;color?:string;rotation?:number}[])=>{
      if(!mesh)return;mesh.visible=visible;mesh.count=positions.length;mesh.castShadow=w.shadows>.15;(mesh.material as THREE.MeshStandardMaterial).opacity=runtime.modelOpacity;
      positions.forEach((p,i)=>{dummy.position.set(p.x,p.y*w.relief,p.z);dummy.rotation.set(0,p.rotation??i*2.4,0);dummy.scale.setScalar(p.size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(p.color)mesh.setColorAt(i,new THREE.Color(p.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    };
    if(visible){
      const radius=Math.max(1.2,8/runtime.zoom);const distance=(p:{x:number;z:number})=>(p.x-runtime.target.x)**2+(p.z-runtime.target.z)**2;
      const nearby=trees.filter(p=>distance(p)<radius*radius).sort((a,b)=>distance(a)-distance(b)).slice(0,650);
      const treePositions=nearby.map(p=>({x:p.x,y:p.y,z:p.z,...forestAppearance(p.x,p.z)}));set(forest.current,treePositions);
      set(rocks.current,runtime.near.filter(c=>mapResource(c)==='mine').flatMap(c=>[0,1,2].map(i=>({x:c.x+.055+i*.015,y:field.height(c.x+.055+i*.015,c.z+.04),z:c.z+.04,size:.016+i*.005}))));
      const owned=runtime.near.filter(c=>c.owner).slice(0,56);set(flags.current,owned.map(c=>({x:c.x+.025,y:sites.get(c.id)!.top+.07/w.relief,z:c.z,size:.025,color:state.agents.find(a=>a.id===c.owner)?.color})));
      const formation=owned.flatMap(c=>{
        const slots=garrisons.get(c.id)??[],composition=garrisonUnitSlots(c.troops,c.units,slots.length);
        return composition.map((unit,i)=>({...slots[i]!,size:.009,rotation:0,unit,destination:c.id}));
      });
      const marching=(state.armies??[]).map(army=>({army,point:armyMapPosition(army,state.cities,state)}))
        .filter(p=>p.point&&distance({x:p.point[0],z:p.point[1]})<radius*radius)
        .sort((a,b)=>distance({x:a.point![0],z:a.point![1]})-distance({x:b.point![0],z:b.point![1]})).slice(0,16)
        .flatMap(({army})=>marchingFormation(army,state.cities,state).map(p=>({...p,destination:army.id,y:field.height(p.x,p.z),size:.009})));
      for(const [unit,ref] of [['spear',troops],['archer',archers],['sword',swords],['cavalry',cavalry]] as const){
        const figures=[...formation,...marching].filter(p=>p.unit===unit);
        unitTargets.current[unit]=figures.map(p=>p.destination);set(ref.current,figures);
        if(ref.current)refreshInstanceBounds(ref.current);
      }
      const pasture=runtime.near.filter(c=>mapResource(c)==='horse').slice(0,56);
      set(horses.current,pasture.flatMap(c=>[0,1].map(i=>({x:c.x+.045+i*.027,y:field.height(c.x+.045+i*.027,c.z+.05),z:c.z+.05,size:.012}))));
      set(fences.current,pasture.flatMap(c=>Array.from({length:5},(_,i)=>({x:c.x+.025+i*.018,y:field.height(c.x+.025+i*.018,c.z+.075)+.009/w.relief,z:c.z+.075,size:.015}))));
    }else for(const ref of [forest,rocks,flags,troops,archers,swords,cavalry,horses,fences])if(ref.current)ref.current.visible=false;
    if(road.current){road.current.visible=w.detail>.08;road.current.scale.y=w.relief;(road.current.material as THREE.LineBasicMaterial).opacity=w.detail*.45;}
  });
  return <>
    <lineSegments ref={road} geometry={roads} raycast={noRaycast}><lineBasicMaterial color="#c1b492" transparent depthWrite={false}/></lineSegments>
    <instancedMesh ref={forest} args={[foliageGeometry,undefined,650]} raycast={noRaycast} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={1} transparent/></instancedMesh>
    <instancedMesh ref={rocks} args={[rockGeometry,undefined,336]} raycast={noRaycast} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={1} transparent/></instancedMesh>
    <instancedMesh ref={flags} args={[undefined,undefined,56]} raycast={noRaycast} frustumCulled={false}><boxGeometry args={[1,.65,.06]}/><meshStandardMaterial color="white" roughness={1} transparent/></instancedMesh>
    <instancedMesh ref={troops} args={[infantryGeometry,undefined,576]} raycast={unitRaycast} onClick={selectUnit('spear')} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={.85} transparent/></instancedMesh>
    <instancedMesh ref={archers} args={[archerGeometry,undefined,576]} raycast={unitRaycast} onClick={selectUnit('archer')} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={.85} transparent/></instancedMesh>
    <instancedMesh ref={swords} args={[swordGeometry,undefined,576]} raycast={unitRaycast} onClick={selectUnit('sword')} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={.85} transparent/></instancedMesh>
    <instancedMesh ref={cavalry} args={[cavalryGeometry,undefined,576]} raycast={unitRaycast} onClick={selectUnit('cavalry')} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={.85} transparent/></instancedMesh>
    <instancedMesh ref={horses} args={[horseGeometry,undefined,112]} raycast={noRaycast} frustumCulled={false}><meshStandardMaterial color="white" vertexColors roughness={1} transparent/></instancedMesh>
    <instancedMesh ref={fences} args={[undefined,undefined,280]} raycast={noRaycast} frustumCulled={false}><boxGeometry args={[.12,1.2,.12]}/><meshStandardMaterial color="#8a7b5d" roughness={1} transparent/></instancedMesh>
  </>;
}

function Labels({state,field,runtime,sites,zoom,selected}:Shared&{zoom:number;selected:number|null}){
  const group=useRef<THREE.Group>(null);useFrame(()=>{if(group.current)group.current.scale.y=runtime.weights.relief;});
  const labels=useMemo(()=>{
    if(zoom>2.8){const chosen:CityState[]=[];for(const c of [...state.cities].sort((a,b)=>(a.id===selected?-1:b.id===selected?1:(a.x-runtime.target.x)**2+(a.z-runtime.target.z)**2-(b.x-runtime.target.x)**2-(b.z-runtime.target.z)**2))){if(chosen.every(p=>Math.hypot(p.x-c.x,p.z-c.z)>1.8/zoom))chosen.push(c);if(chosen.length>=10)break;}return chosen;}
    const chosen:CityState[]=[];for(const c of [...state.cities].sort((a,b)=>Number(!!b.imperial)-Number(!!a.imperial)||Number(!!b.owner)-Number(!!a.owner)||Number(!!b.seat)-Number(!!a.seat))){if(!c.seat&&!c.imperial)continue;if(chosen.every(p=>Math.hypot(p.x-c.x,p.z-c.z)>1.6/zoom))chosen.push(c);if(chosen.length>=12)break;}return chosen;
  },[state,selected,Math.round(zoom*3),runtime.target.x,runtime.target.z]);
  return <group ref={group}>
    {labels.map(c=><Html key={c.id} position={[c.x,sites.get(c.id)!.top+.055,c.z]} center style={{pointerEvents:'none'}} zIndexRange={[5,0]}><div className="terrain-city-label">{c.name}{mapResource(c)?<small>{mapResource(c)==='farm'?'禾':mapResource(c)==='mine'?'◆':'马'}</small>:null}</div></Html>)}
    {zoom<3&&state.agents.map(a=>{const owned=state.cities.filter(c=>c.owner===a.id);if(!owned.length)return null;const x=owned.reduce((s,c)=>s+c.x,0)/owned.length,z=owned.reduce((s,c)=>s+c.z,0)/owned.length;return <Html key={a.id} position={[x,field.height(x,z)+.04,z-.22]} center style={{pointerEvents:'none',opacity:Math.max(0,Math.min(1,3-zoom))}} zIndexRange={[4,0]}><span className="terrain-faction-label" style={{color:a.color}}>{a.name}</span></Html>;})}
  </group>;
}

function ArmyFlags({state,field,runtime,onSelectArmy,selectedArmyId}:Shared&Pick<Props,'onSelectArmy'|'selectedArmyId'>) {
  const ref=useRef<THREE.InstancedMesh>(null);
  const {camera}=useThree();
  const upright=useMemo(()=>new THREE.Quaternion(),[]);
  const armies=state.armies??[];
  const positions=armies.map(a=>armyMapPosition(a,state.cities,state));
  const geometry=useMemo(()=>{
    const pole=new THREE.CylinderGeometry(.035,.035,1,5);pole.translate(0,.5,0);
    const flag=new THREE.BoxGeometry(.6,.4,.025);flag.translate(.3,.75,0);
    const merged=mergeGeometries([pole,flag]);pole.dispose();flag.dispose();return merged;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    const mesh=ref.current;if(!mesh)return;
    armies.forEach((a,i)=>{
      const p=positions[i];
      dummy.position.set(p?.[0]??0,p?field.height(...p)*runtime.weights.relief+.03:0,p?.[1]??0);
      dummy.quaternion.copy(camera.quaternion).slerp(upright,runtime.weights.models);
      dummy.scale.setScalar(p?.length?Math.max(.028,.28/Math.sqrt(runtime.zoom)):0);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,new THREE.Color(a.id===selectedArmyId?'#f4e3ae':state.agents.find(f=>f.id===a.owner)?.color??'#c9ba91'));
    });
    refreshInstanceBounds(mesh);if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  });
  return <instancedMesh ref={ref} args={[geometry,undefined,Math.max(1,armies.length)]} count={armies.length} frustumCulled={false} renderOrder={6}
    onClick={e=>{if(e.delta>5)return;const a=armies[e.instanceId??-1];if(a){e.stopPropagation();onSelectArmy?.(a.id);}}}>
    <meshBasicMaterial depthTest={false}/>
  </instancedMesh>;
}

function Lighting({runtime}: {runtime:Runtime}){
  const light=useRef<THREE.DirectionalLight>(null);const {gl}=useThree();
  useFrame(()=>{if(!light.current)return;const strength=runtime.weights.shadows;gl.shadowMap.autoUpdate=strength>.02;light.current.castShadow=strength>.02;light.current.shadow.intensity=strength*.65;light.current.position.set(runtime.target.x-4,8,runtime.target.z+3);light.current.target.position.copy(runtime.target);light.current.target.updateMatrixWorld();});
  return <><hemisphereLight args={['#e4ecdf','#777565',1.65]}/><directionalLight ref={light} color="#fff0d4" intensity={2.1} shadow-mapSize={[2048,2048]} shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={1.5} shadow-camera-bottom={-1.5} shadow-normalBias={.003} shadow-bias={-.0001}/></>;
}

export function ZoomTerrainMap(props:Props){
  return <WebGLGuard fallback={<><StrategicMap {...props}/><span className="terrain-fallback" role="status">浏览器无法启用三维图形，已切换平面地图，选城与战局操作仍可使用。</span></>}><ThreeDimensionalMap {...props}/></WebGLGuard>;
}
function ThreeDimensionalMap(props:Props){
  const {state,selected,onSelect,reset}=props;
  const geometryKey=state.cities.map(c=>`${c.id}:${c.x}:${c.z}`).join('|');
  const field=useMemo(()=>createTerrainField(state.map!,state.cities),[geometryKey,state.map?.id]);
  const siteKey=state.cities.map(c=>`${c.id}:${c.level}:${c.imperial}:${c.seat}`).join('|');
  const sites=useMemo(()=>createBuildingSites(field,state.cities),[field,siteKey]);
  const runtime=useMemo<Runtime>(()=>({zoom:1,desired:1,target:new THREE.Vector3(field.bounds.center[0],0,field.bounds.center[1]),weights:transitionAt(1),ready:false,modelOpacity:0,near:[],cityAlpha:new Map(),focus:null,armyFocus:null,reset:0,command:0,drawCalls:0,triangles:0}),[field]);
  const [view,setView]=useState({zoom:1,x:0,z:0,models:0,calls:0}),[loadModels,setLoadModels]=useState(false),[localReset,setLocalReset]=useState(0);const zoom=view.zoom;
  runtime.focus=selected;runtime.reset=reset+localReset;
  runtime.armyFocus=props.selectedArmyId??null;
  const metrics=(value:number)=>{setView(old=>Math.abs(old.zoom-value)+Math.abs(old.x-runtime.target.x)+Math.abs(old.z-runtime.target.z)+Math.abs(old.models-runtime.modelOpacity)<.0001&&old.calls===runtime.drawCalls?old:{zoom:value,x:runtime.target.x,z:runtime.target.z,models:runtime.modelOpacity,calls:runtime.drawCalls});if(value>CONFIG.preload)setLoadModels(true);};
  const shared={state,field,runtime,sites};
  return <MapBoundary key={geometryKey} fallback={<><StrategicMap {...props}/><span className="terrain-fallback">三维渲染不可用，已切换可操作的平面地图</span></>}>
    <div className="continuous-terrain" data-zoom={zoom.toFixed(2)} data-political={transitionAt(zoom).political.toFixed(3)} data-relief={transitionAt(zoom).relief.toFixed(3)} data-models={runtime.modelOpacity.toFixed(3)} data-draw-calls={runtime.drawCalls} data-triangles={runtime.triangles} data-selected={selected??''}>
      <Canvas frameloop="demand" orthographic shadows camera={{position:mapCameraView(1,1,1,1,1).offset,near:.01,far:160,zoom:20}} dpr={[1.5,2]} gl={{antialias:true,alpha:false}} fallback={<StrategicMap {...props}/>}>
        <color attach="background" args={['#a4b7b4']}/>
        <CameraRig {...shared} onMetrics={metrics}/><Lighting runtime={runtime}/>
        <Surface {...shared} selected={selected} onSelect={onSelect}/><CitySymbols {...shared} onSelect={onSelect}/>
        <Labels {...shared} zoom={zoom} selected={selected}/>
        <ArmyFlags {...shared} onSelectArmy={props.onSelectArmy} selectedArmyId={props.selectedArmyId}/>
        {loadModels&&<Suspense fallback={null}><LandscapeDetails {...shared} onSelect={onSelect} onSelectArmy={props.onSelectArmy}/></Suspense>}
        {loadModels&&<Suspense fallback={null}><Buildings {...shared} onSelect={onSelect}/></Suspense>}
      </Canvas>
      <div className="terrain-navigation"><button aria-label="缩小地图" onClick={()=>{runtime.desired=Math.max(1,runtime.desired/1.6);runtime.requestFrame?.();}}>−</button><button aria-label="重置地图视角" onClick={()=>{onSelect(-1);setLocalReset(v=>v+1);}}>全境</button><button aria-label="放大地图" onClick={()=>{runtime.desired=Math.min(CONFIG.maxZoom,runtime.desired*1.6);runtime.requestFrame?.();}}>＋</button></div>
    </div>
  </MapBoundary>;
}
