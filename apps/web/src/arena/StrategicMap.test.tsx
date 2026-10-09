import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { generateBattle } from '../../../api/src/domain/generate';
import { StrategicMap } from './StrategicMap';

describe('flat county strategy map',()=>{
  it('selects a stationary army by identity rather than selecting its city',()=>{
    const state=generateBattle('stationary-flag'),city=state.cities[0]!;
    state.armies=[{id:'camp',name:'先登军',owner:'agent-1',troops:6,route:[city.id,city.id],leg:0,progress:0,speed:.7,halted:true,persistent:true,stance:'camp'}];
    const army=vi.fn(),select=vi.fn();render(<StrategicMap state={state} selected={null} onSelect={select} reset={0} onSelectArmy={army}/>);
    fireEvent.click(screen.getByRole('button',{name:'选择军队 先登军'}));expect(army).toHaveBeenCalledWith('camp');expect(select).not.toHaveBeenCalled();
  });
  it('shows territory, terrain and resources without a 3D canvas, and updates conquest color in place',()=>{
    const state=generateBattle('strategic-map');
    const props={state,selected:null,onSelect:vi.fn(),reset:0};
    const {container,rerender}=render(<StrategicMap {...props}/>);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelectorAll('[data-county-id]')).toHaveLength(300);
    expect(container.querySelector('[data-layer="commandery-borders"]')).not.toBeNull();
    expect(container.querySelector('[data-layer="mountains"]')).not.toBeNull();
    expect(container.querySelector('[data-layer="rivers"]')).not.toBeNull();
    for(const kind of ['farm','mine','horse'])expect(container.querySelector(`[data-resource="${kind}"]`)).not.toBeNull();
    const neutral=state.cities.find(c=>!c.owner)!;
    const region=container.querySelector(`[data-county-id="${neutral.id}"]`)!;
    const before=region.getAttribute('fill');
    const next={...state,cities:state.cities.map(c=>c.id===neutral.id?{...c,owner:state.agents[0]!.id}:c)};
    rerender(<StrategicMap {...props} state={next}/>);
    expect(region.getAttribute('fill')).toBe(state.agents[0]!.color);
    expect(region.getAttribute('fill')).not.toBe(before);
    fireEvent.click(region);
    expect(props.onSelect).toHaveBeenCalledWith(neutral.id);
    rerender(<StrategicMap {...props}/>);
    expect(region.getAttribute('fill')).toBe(before);
  });
  it('zooms without introducing models and resets to a whole-map view',()=>{
    const state=generateBattle('zoom-map');
    const {container,rerender}=render(<StrategicMap state={state} selected={null} onSelect={()=>{}} reset={0}/>);
    const svg=screen.getByLabelText('郡县疆域战略地图');
    const before=svg.getAttribute('viewBox');
    fireEvent.click(screen.getByRole('button',{name:'放大地图'}));
    expect(svg.getAttribute('viewBox')).not.toBe(before);
    expect(container.querySelector('canvas')).toBeNull();
    rerender(<StrategicMap state={state} selected={null} onSelect={()=>{}} reset={1}/>);
    expect(svg.getAttribute('viewBox')).toBe(before);
  });
  it('toggles resource visibility without losing county boundaries',()=>{
    const state=generateBattle('resource-layers');
    const {container}=render(<StrategicMap state={state} selected={null} onSelect={()=>{}} reset={0}/>);
    fireEvent.click(screen.getByRole('button',{name:'资源地标'}));
    expect(container.querySelector('[data-layer="resources"]')).toBeNull();
    expect(container.querySelectorAll('[data-county-id]')).toHaveLength(300);
    fireEvent.click(screen.getByRole('button',{name:'资源地标'}));
    expect(container.querySelector('[data-layer="resources"]')).not.toBeNull();
  });
});
