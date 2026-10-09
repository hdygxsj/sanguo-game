import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {generateBattle} from '../../../api/src/domain/generate';
import {CampaignMinimap} from './CampaignMinimap';
it('shows territory and lets the player navigate to a settlement by pointer or keyboard',()=>{
  const state=generateBattle('minimap');const select=vi.fn();
  const {container}=render(<CampaignMinimap state={state} selected={0} onSelect={select}/>);
  expect(screen.getByLabelText('天下小地图')).toBeInTheDocument();
  const region=container.querySelector('[data-mini-county="0"]')!;
  fireEvent.click(region);expect(select).toHaveBeenCalledWith(0);
  fireEvent.keyDown(region,{key:'Enter'});expect(select).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[data-mini-focus]')).not.toBeNull();
});
it('marks capitals as separately selectable strategic targets',()=>{
  const state=generateBattle('capital-mini'),select=vi.fn(),id=state.agents[0]!.startingCityId!;
  state.polities={'agent-1':{prestige:300,kingdom:{name:'魏',capitalId:id,foundedTurn:0,lastMigrationTurn:0}}};
  render(<CampaignMinimap state={state} selected={null} onSelect={select}/>);
  fireEvent.click(screen.getByRole('button',{name:`定位魏国首都${state.cities[id]!.name}`}));expect(select).toHaveBeenCalledWith(id);
});
