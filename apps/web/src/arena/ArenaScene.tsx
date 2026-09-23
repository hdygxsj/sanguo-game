import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState } from 'react';
import type { Group, Object3D } from 'three';
import type { BattleState, CityState, DomainEvent } from '../types';
import { buildingForCity, cityWorldPosition, TILE_SPACING } from './arenaLogic';

const MODEL_URL = '/models/agent-arena/arena-kit.glb';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function SceneAsset({ name, scale = 0.68 }: { name: string; scale?: number }) {
  const { scene } = useGLTF(MODEL_URL);
  const object = useMemo(() => {
    const source = scene.getObjectByName(name);
    return source?.clone(true) ?? null;
  }, [name, scene]);
  if (!object) return null;
  return <primitive object={object} scale={scale} />;
}

function Flag({ color, active }: { color: string; active: boolean }) {
  const flag = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 1.8) * 0.07;
  });
  return (
    <group ref={flag} position={[0.58, 1.05, -0.42]}>
      <mesh position={[0, -.28, 0]} castShadow><cylinderGeometry args={[.025, .035, 1.15, 8]} /><meshStandardMaterial color="#332d3d" /></mesh>
      <mesh position={[.18, .18, 0]} castShadow><planeGeometry args={[.4, .25]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? .22 : 0} side={2} /></mesh>
    </group>
  );
}

function ResourceMarker({ city }: { city: CityState }) {
  if (city.resourceTrait === 'granary') {
    return (
      <group position={[-.78, .22, .65]}>
        {[-.18, 0, .18].map((x) => <mesh key={x} position={[x, .12, 0]} rotation={[0, 0, -.25]}><cylinderGeometry args={[.018, .025, .5, 6]} /><meshStandardMaterial color="#bda454" /></mesh>)}
      </group>
    );
  }
  if (city.resourceTrait === 'ore-vein') {
    return (
      <group position={[-.74, .16, .62]}>
        <mesh rotation={[.2, 0, -.25]}><octahedronGeometry args={[.23, 0]} /><meshStandardMaterial color="#667985" metalness={.45} roughness={.55} /></mesh>
        <mesh position={[.22, -.03, .1]} scale={.65}><octahedronGeometry args={[.23, 0]} /><meshStandardMaterial color="#8998a0" metalness={.4} /></mesh>
      </group>
    );
  }
  return null;
}

function CityTile({ city, state, highlighted, onSelect }: { city: CityState; state: BattleState; highlighted: boolean; onSelect: () => void }) {
  const [x, z] = cityWorldPosition(city, state.columns, state.rows);
  const owner = state.agents.find((agent) => agent.id === city.owner);
  const terrainColor = city.terrain === 'blocked' ? '#27343b' : city.terrain === 'farmland' ? '#314833' : city.terrain === 'mine' ? '#343d42' : '#273c35';
  const rim = owner?.color ?? (city.imperial ? '#d5a83e' : '#43564f');
  const model = buildingForCity(city);
  const pulse = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (pulse.current && highlighted) {
      const value = 1 + Math.sin(clock.elapsedTime * 5) * .04;
      pulse.current.scale.setScalar(value);
    }
  });
  return (
    <group position={[x, 0, z]} ref={pulse}>
      <mesh receiveShadow onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <boxGeometry args={[2.15, .16, 2.15]} />
        <meshStandardMaterial color={terrainColor} roughness={.92} emissive={rim} emissiveIntensity={highlighted ? .22 : .035} />
      </mesh>
      <mesh position={[0, .09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.96, 1.03, 4]} />
        <meshBasicMaterial color={rim} transparent opacity={highlighted ? .85 : .32} />
      </mesh>
      <group position={[0, .12, 0]} rotation={[0, city.id % 4 * Math.PI / 2, 0]}>
        <SceneAsset name={model} scale={model === 'mountain' ? .72 : .66} />
        {city.terrain !== 'blocked' && <ResourceMarker city={city} />}
        {owner && <Flag color={owner.color} active={owner.active} />}
      </group>
      {city.weather !== 'clear' && <mesh position={[.82, .18, -.82]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.12, 16]} /><meshBasicMaterial color={city.weather === 'rain' ? '#65a5d8' : city.weather === 'fog' ? '#9aa3a4' : '#daeaf2'} transparent opacity={.8} /></mesh>}
      <Html center position={[0, 1.9, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div className={`city-label ${highlighted ? 'selected' : ''}`}>
          <span>{city.name}{city.imperial ? ' · 帝都' : ''}</span>
          <b>{city.terrain === 'blocked' ? '天险' : `${city.troops} 兵`}</b>
        </div>
      </Html>
    </group>
  );
}

function Roads({ state }: { state: BattleState }) {
  const connections = useMemo(() => state.cities.flatMap((city) => city.adjacent
    .filter((id) => id > city.id)
    .map((id) => {
      const target = state.cities[id];
      if (!target) return null;
      const [ax, az] = cityWorldPosition(city, state.columns, state.rows);
      const [bx, bz] = cityWorldPosition(target, state.columns, state.rows);
      return { key: `${city.id}-${id}`, points: [[ax, .13, az], [bx, .13, bz]] as [number, number, number][] };
    })).filter(Boolean), [state]);
  return <>{connections.map((road) => road && <Line key={road.key} points={road.points} color="#665c48" lineWidth={1.25} transparent opacity={.55} />)}</>;
}

function Scene({ state, events }: { state: BattleState; events: DomainEvent[] }) {
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const recentCities = useMemo(() => new Set(events.slice(-8).flatMap((event) => [event.cityId, event.fromCityId, event.toCityId].filter((id): id is number => id !== undefined))), [events]);
  return (
    <>
      <color attach="background" args={['#080b12']} />
      <fog attach="fog" args={['#080b12', 18, 38]} />
      <ambientLight intensity={1.2} color="#a7b8c5" />
      <directionalLight position={[8, 15, 5]} intensity={2.2} color="#ffdfaa" castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={['#8d9dff', '#1b251e', .8]} />
      <mesh position={[0, -.15, 0]} receiveShadow><boxGeometry args={[state.columns * TILE_SPACING + 3, .25, state.rows * TILE_SPACING + 3]} /><meshStandardMaterial color="#131d1b" roughness={1} /></mesh>
      <gridHelper args={[Math.max(state.columns, state.rows) * TILE_SPACING + 3, Math.max(state.columns, state.rows) * 2, '#263630', '#17221f']} position={[0, .001, 0]} />
      <Roads state={state} />
      {state.cities.map((city) => (
        <CityTile key={city.id} city={city} state={state} highlighted={city.id === selectedCityId || recentCities.has(city.id)} onSelect={() => setSelectedCityId(city.id === selectedCityId ? null : city.id)} />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={.08} minPolarAngle={.48} maxPolarAngle={1.22} minDistance={8} maxDistance={35} target={[0, 0, 0]} />
    </>
  );
}

export function ArenaScene({ state, events }: { state: BattleState; events: DomainEvent[] }) {
  const webgl = useMemo(supportsWebGL, []);
  if (!webgl) {
    return (
      <div className="webgl-fallback">
        <img src="/images/arena-fallback.png" alt="由 Blender 模型渲染的 Agent 竞技场沙盘" />
        <div><b>静态沙盘模式</b><span>当前浏览器未启用 WebGL；战局数据与回合操作仍可正常使用。</span></div>
      </div>
    );
  }
  return (
    <Canvas fallback={<div className="webgl-fallback compact"><span>3D 渲染不可用</span></div>} shadows dpr={[1, 1.75]} camera={{ position: [12, 15, 15], fov: 42, near: .1, far: 100 }} gl={{ antialias: true }}>
      <Suspense fallback={null}><Scene state={state} events={events} /></Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
