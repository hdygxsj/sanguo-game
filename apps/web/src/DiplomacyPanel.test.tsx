import {chooseOption} from './testSelect';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {DiplomacyPanel} from './DiplomacyPanel';
import type {BattleState} from './types';
import {generateBattle} from '../../api/src/domain/generate';

const state:BattleState={seed:'diplomacy',version:0,turn:0,maxTurns:0,columns:5,rows:4,status:'active',winner:null,resources:{a:100,b:100},cities:[],agents:[{id:'a',name:'曹操',color:'#aaa',strategy:'balanced',active:true},{id:'b',name:'刘备',color:'#bbb',strategy:'balanced',active:true}]};
it('sends the selected treaty and gift as a ruler order',()=>{
  const submit=vi.fn();render(<DiplomacyPanel state={state} playerId="a" disabled={false} onOrder={submit}/>);
  fireEvent.change(screen.getByLabelText('外交礼金'),{target:{value:'40'}});
  fireEvent.click(screen.getByRole('button',{name:'派遣使者并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'diplomacy',targetAgentId:'b',treaty:'peace',offer:40}});
});
it('exposes player acceptance and rejection, disabled when replaying',()=>{
  const submit=vi.fn(),next={...state,diplomaticOffers:[{id:'offer',from:'b',to:'a',treaty:'peace' as const,offer:20,expiresTurn:3}]};
  const view=render(<DiplomacyPanel state={next} playerId="a" disabled={false} onOrder={submit}/>);
  fireEvent.click(screen.getByRole('button',{name:'接受提议'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'respond-diplomacy',offerId:'offer',accept:true}});
  view.rerender(<DiplomacyPanel state={next} playerId="a" disabled={true} onOrder={submit}/>);
  expect(screen.getByRole('button',{name:'拒绝提议'})).toBeDisabled();
});
it('submits named adult partners as explicit peace-marriage terms',()=>{
  const s=generateBattle('marriage-ui',7,5,2),submit=vi.fn();s.resources['agent-1']=100;
  render(<DiplomacyPanel state={s} playerId="agent-1" disabled={false} onOrder={submit}/>);
  fireEvent.click(screen.getByLabelText('附加联姻条款'));
  chooseOption(screen.getByLabelText('对方婚配人物'),'person-2-2');
  fireEvent.click(screen.getByRole('button',{name:'派遣使者并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'diplomacy',targetAgentId:'agent-2',treaty:'peace',offer:40,marriage:{personId:'person-1-0',partnerId:'person-2-2'}}});
});
