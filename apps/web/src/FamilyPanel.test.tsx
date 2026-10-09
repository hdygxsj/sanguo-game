import {chooseOption} from './testSelect';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {generateBattle} from '../../api/src/domain/generate';
import {FamilyPanel} from './FamilyPanel';
it('submits a paid marriage through the ruler-order pipeline',()=>{
  const state=generateBattle('family-ui',7,5,2),submit=vi.fn();state.resources['agent-1']=100;
  render(<FamilyPanel state={state} playerId="agent-1" personId="person-1-0" disabled={false} onOrder={submit}/>);
  fireEvent.click(screen.getByText('婚姻与家族'));
  chooseOption(screen.getByLabelText('婚配对象'),'person-1-2');
  fireEvent.click(screen.getByRole('button',{name:'缔结关系 · 40'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'form-union',personId:'person-1-0',partnerId:'person-1-2',kind:'spouse'}});
});
it('shows saved relationships and disables replay commands',()=>{
  const state=generateBattle('family-ui',7,5,2);state.unions=[{id:'u',personId:'person-1-0',partnerId:'person-1-2',kind:'spouse',formedTurn:2}];
  render(<FamilyPanel state={state} playerId="agent-1" personId="person-1-0" disabled={true} onOrder={()=>{}}/>);
  fireEvent.click(screen.getByText('婚姻与家族'));
  expect(screen.getByText('卞夫人 · 配偶 · 第 2 回合')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'缔结关系 · 40'})).toBeDisabled();
});
it('keeps the submitted partner selected after settlement',()=>{
  const state=generateBattle('family-ui',7,5,2);state.resources['agent-1']=100;
  const props={state,playerId:'agent-1',personId:'person-1-0',disabled:false,onOrder:()=>{}};
  const view=render(<FamilyPanel {...props}/>);fireEvent.click(screen.getByText('婚姻与家族'));
  fireEvent.click(screen.getByRole('button',{name:'缔结关系 · 40'}));
  view.rerender(<FamilyPanel {...props} state={{...state,unions:[{id:'u',personId:'person-1-0',partnerId:'person-1-2',kind:'spouse',formedTurn:1}]}}/>);
  expect(screen.getByLabelText('婚配对象')).toHaveValue('person-1-2');
});
it('shows pregnancy timing and recorded children with ages',()=>{
  const state=generateBattle('family-ui',7,5,2);state.unions=[{id:'u',personId:'person-1-0',partnerId:'person-1-2',kind:'spouse',formedTurn:1,pregnancyDueTurn:7}];
  state.characters!.push({...state.characters![1]!,id:'child',name:'曹宁1',ageYears:2,parentIds:['person-1-0','person-1-2']});
  render(<FamilyPanel state={state} playerId="agent-1" personId="person-1-0" disabled={false} onOrder={()=>{}}/>);
  fireEvent.click(screen.getByText('婚姻与家族'));
  expect(screen.getByText('预计第 7 回合添丁')).toBeInTheDocument();
  expect(screen.getByText('曹宁1 · 2 岁 · 未成年')).toBeInTheDocument();
});
