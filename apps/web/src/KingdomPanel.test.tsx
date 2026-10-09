import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {generateBattle} from '../../api/src/domain/generate';
import {KingdomPanel} from './KingdomPanel';
import {chooseOption} from './testSelect';
function fixture(){const s=generateBattle('kingdom-panel',7,5,2);s.resources['agent-1']=1000;s.polities={'agent-1':{prestige:300}};s.cities.filter(c=>!c.owner&&c.terrain!=='blocked').slice(0,4).forEach(c=>c.owner='agent-1');return s;}
it('opens talent discovery from national policy rather than personnel administration',()=>{
 render(<KingdomPanel state={fixture()} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
 fireEvent.click(screen.getByRole('tab',{name:'人才寻访'}));
 expect(screen.getByRole('combobox',{name:'在野人物'})).toBeVisible();
 expect(screen.queryByText(/招贤馆/)).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'立国 · 200'})).not.toBeInTheDocument();
});
it('shows prestige sources, trait and validated founding action with an explicit alliance warning',()=>{
  const s=fixture(),order=vi.fn();render(<KingdomPanel state={s} playerId="agent-1" disabled={false} onOrder={order}/>);
  expect(screen.getByText('屯田治军')).toBeVisible();expect(screen.getByText(/经济/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('国号'),{target:{value:'大魏'}});
  expect(screen.getByText(/解除本势力所有联盟/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'立国 · 200'}));
  expect(order).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'found-kingdom',name:'大魏'}});
});
it('shows capital and forty-turn progress, migrates through custom menu and locks replay',()=>{
  const s=fixture(),order=vi.fn(),id=s.agents[0]!.startingCityId!;
  s.turn=20;s.polities!['agent-1']!.kingdom={name:'魏',capitalId:id,foundedTurn:1,lastMigrationTurn:1};
  const v=render(<KingdomPanel state={s} playerId="agent-1" disabled={false} onOrder={order}/>);
  expect(screen.getByText('19 / 40 回合')).toBeVisible();
  const target=s.cities.find(c=>c.owner==='agent-1'&&c.id!==id&&(!c.siteKind||c.siteKind==='city'))!;
  chooseOption(screen.getByRole('combobox',{name:'新首都'}),String(target.id));
  fireEvent.click(screen.getByRole('button',{name:/迁都 ·/}));expect(order).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'move-capital',cityId:target.id}});
  v.rerender(<KingdomPanel state={s} playerId="agent-1" disabled onOrder={order}/>);expect(screen.getByRole('button',{name:/迁都 ·/})).toBeDisabled();
});
it('explains founding requirements and keeps spectators read only',()=>{
  const s=fixture();s.polities!['agent-1']!.prestige=0;
  const v=render(<KingdomPanel state={s} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
  expect(screen.getByRole('button',{name:'立国 · 200'})).toBeDisabled();
  v.rerender(<KingdomPanel state={s} playerId={null} disabled={false} onOrder={()=>{}}/>);
  expect(screen.queryByRole('button',{name:'立国 · 200'})).not.toBeInTheDocument();
});
