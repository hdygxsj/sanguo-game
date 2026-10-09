import {chooseOption} from './testSelect';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {EquipmentPanel} from './EquipmentPanel';
import {generateBattle} from '../../api/src/domain/generate';
it('buys an item and equips owned inventory through ruler orders',()=>{
  const state=generateBattle('equipment',7,5,2),submit=vi.fn();state.resources['agent-1']=200;
  state.equipment=[{id:'horse',templateId:'red-hare',owner:'agent-1'}];
  render(<EquipmentPanel state={state} playerId="agent-1" characterId="person-1-1" disabled={false} onOrder={submit}/>);
  fireEvent.click(screen.getByText('装备与府库'));
  fireEvent.click(screen.getByRole('button',{name:'购入 · 35'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'buy-equipment',templateId:'iron-sword'}});
  fireEvent.click(screen.getByRole('button',{name:'装备给当前人物'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'equip-equipment',characterId:'person-1-1',itemId:'horse'}});
});
it('prevents buying unavailable unique equipment and issuing commands in replay',()=>{
  const state=generateBattle('equipment',7,5,2);state.equipment=[{id:'horse',templateId:'red-hare',owner:'agent-2'}];
  const view=render(<EquipmentPanel state={state} playerId="agent-1" characterId="person-1-1" disabled={true} onOrder={()=>{}}/>);
  fireEvent.click(screen.getByText('装备与府库'));
  expect(screen.getByRole('button',{name:'购入 · 35'})).toBeDisabled();
  view.rerender(<EquipmentPanel state={state} playerId="agent-1" characterId="person-1-1" disabled={false} onOrder={()=>{}}/>);
  chooseOption(screen.getByLabelText('寻访购置'),'red-hare');
  expect(screen.getByText('天下已有此物，不能重复购置。')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'购入 · 120'})).toBeDisabled();
});
