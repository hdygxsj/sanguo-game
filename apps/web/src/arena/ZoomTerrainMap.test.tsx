import {Children,isValidElement,type ReactNode} from 'react';
import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {historicGeography} from '../../../api/src/domain/hanGeography';
import {generateBattle} from '../../../api/src/domain/generate';
import type {BattleState} from '../types';
import {ZoomTerrainMap} from './ZoomTerrainMap';

const scene=vi.hoisted(()=>({children:null as ReactNode,frameloop:undefined as string|undefined}));
afterEach(()=>vi.restoreAllMocks());
// Inspect the real scene composition without needing a WebGL context in jsdom.
vi.mock('@react-three/fiber',()=>({Canvas:({children,frameloop}:{children:ReactNode;frameloop?:string})=>{scene.children=children;scene.frameloop=frameloop;return null;},useFrame:vi.fn(),useThree:vi.fn()}));
function nodes(children:ReactNode):Array<{name:string;props:Record<string,unknown>}>{
  return Children.toArray(children).flatMap(child=>{
    if(!isValidElement(child))return [];
    const props=child.props as Record<string,unknown>;
    return [{name:typeof child.type==='function'?child.type.name:String(child.type),props},...nodes(props.children as ReactNode)];
  });
}
it('keeps the complete county map selectable and zoomable when WebGL is disabled',()=>{
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  scene.children=null;
  const state=generateBattle('disabled-webgl');
  const onSelect=vi.fn();
  const {container}=render(<ZoomTerrainMap state={state} selected={null} onSelect={onSelect} reset={0}/>);
  expect(scene.children).toBeNull();
  expect(container.querySelectorAll('[data-county-id]')).toHaveLength(300);
  const county=container.querySelector('[data-county-id]')!;
  fireEvent.click(county);
  expect(onSelect).toHaveBeenCalledWith(Number(county.getAttribute('data-county-id')));
  const svg=screen.getByLabelText('郡县疆域战略地图');
  const before=svg.getAttribute('viewBox');
  fireEvent.click(screen.getByRole('button',{name:'放大地图'}));
  expect(svg.getAttribute('viewBox')).not.toBe(before);
  expect(screen.getByRole('status')).toHaveTextContent('已切换平面地图');
});
it('defers all 3D asset consumers until approach, retaining them across reverse zoom without losing political interactions',()=>{
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getExtension:()=>null} as unknown as WebGL2RenderingContext);
  const geo=historicGeography(()=>.5);
  const state={cities:geo.cities,map:geo.map} as BattleState;
  render(<ZoomTerrainMap state={state} selected={null} onSelect={()=>{}} reset={0}/>);
  const names=()=>nodes(scene.children).map(n=>n.name);
  expect(scene.frameloop).toBe('demand');
  const runtime=nodes(scene.children).find(n=>n.name==='CameraRig')!.props.runtime as {desired:number;requestFrame?:()=>void};
  runtime.requestFrame=vi.fn();
  fireEvent.click(screen.getByRole('button',{name:'放大地图'}));
  expect(runtime.desired).toBe(1.6);
  expect(runtime.requestFrame).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'缩小地图'}));
  expect(runtime.desired).toBe(1);
  expect(runtime.requestFrame).toHaveBeenCalledTimes(2);
  expect(nodes(scene.children).find(n=>n.name==='CameraRig')!.props.runtime).toHaveProperty('armyFocus',null);
  expect(names()).not.toContain('LandscapeDetails');
  expect(names()).not.toContain('Buildings');
  expect(names()).toEqual(expect.arrayContaining(['Surface','CitySymbols','ArmyFlags']));
  const metrics=()=>nodes(scene.children).find(n=>n.name==='CameraRig')!.props.onMetrics as (zoom:number)=>void;
  act(()=>metrics()(2));
  expect(names()).toEqual(expect.arrayContaining(['LandscapeDetails','Buildings']));
  act(()=>metrics()(1));
  expect(names()).toEqual(expect.arrayContaining(['LandscapeDetails','Buildings','CitySymbols']));
});
