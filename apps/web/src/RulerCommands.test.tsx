import {chooseOption} from './testSelect';
import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {RulerCommands} from './RulerCommands';
import type {BattleState} from './types';

const state:BattleState={seed:'ruler',version:0,turn:0,maxTurns:0,columns:5,rows:4,status:'active',winner:null,
  agents:[{id:'a',name:'曹操',color:'#aaa',strategy:'balanced',active:true}],resources:{a:80},
  cities:[{id:0,name:'濮阳',x:0,z:0,adjacent:[1],owner:'a',troops:30,level:1,terrain:'plain',weather:'clear',resourceTrait:null,defenseMultiplier:1.12,imperial:false},
  {id:1,name:'陈留',x:2,z:0,adjacent:[0],owner:null,troops:4,level:1,terrain:'plain',weather:'clear',resourceTrait:null,defenseMultiplier:1.12,imperial:false}]};

it('shows hundreds of soldiers and rejects fractional companies',()=>{
  const submit=vi.fn();render(<RulerCommands state={state} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={false} focusedCityId={0}/>);
  const input=screen.getByLabelText('兵力数量');expect(input).toHaveValue(600);expect(input).toHaveAttribute('step','100');
  expect(screen.getByText(/驻军编制：枪兵 3,000 人/)).toBeInTheDocument();
  fireEvent.change(input,{target:{value:'501'}});expect(screen.getByRole('button',{name:'下令并结束回合'})).toBeDisabled();
});

it('offers a turn-consuming recall for a stranded owned army',()=>{
  const next=structuredClone(state),submit=vi.fn();
  next.armies=[{id:'stranded',owner:'a',troops:12,route:[0,1],leg:0,progress:1,speed:.7,halted:true}];
  const view=render(<RulerCommands state={next} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={false} focusedCityId={0}/>);
  fireEvent.click(screen.getByRole('button',{name:'撤回濮阳 · 结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'recall-army',armyId:'stranded'}});
  view.rerender(<RulerCommands state={next} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={true} focusedCityId={0}/>);
  expect(screen.getByRole('button',{name:'撤回濮阳 · 结束回合'})).toBeDisabled();
});

it('shows timed construction and submits a building choice without upgrading city level',()=>{
  const submit=vi.fn();const props={state,playerId:'a',onPlayerChange:()=>{},onOrder:submit,disabled:false,focusedCityId:0};
  const view=render(<RulerCommands {...props}/>);
  chooseOption(screen.getByLabelText('战略行动'),'develop');
  chooseOption(screen.getByLabelText('建设项目'),'market');
  expect(screen.getByText('本次耗资 40')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'下令并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'develop',cityId:0,building:'market'}});
  const busy=structuredClone(state);busy.cities[0]!.construction={building:'market',level:1,completesTurn:2};
  view.rerender(<RulerCommands {...props} state={busy}/>);
  expect(screen.getByText(/在建：市集/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'下令并结束回合'})).toBeDisabled();
});
it('displays the same barracks recruitment price as the server',()=>{
  const next=structuredClone(state);next.cities[0]!.buildings={barracks:3};
  render(<RulerCommands state={next} playerId="a" onPlayerChange={()=>{}} onOrder={()=>{}} disabled={false} focusedCityId={0}/>);
  chooseOption(screen.getByLabelText('征募兵种'),'cavalry');
  expect(screen.getByText('本次耗资 30')).toBeInTheDocument();
});

it('submits an explicit recruit command for the selected ruler',()=>{
  const submit=vi.fn();
  render(<RulerCommands state={state} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={false} focusedCityId={0}/>);
  fireEvent.change(screen.getByLabelText('兵力数量'),{target:{value:'500'}});
  fireEvent.click(screen.getByRole('button',{name:'下令并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'recruit',cityId:0,amount:5}});
});
it('shows complete projected fiscal balance before the ruler spends treasury',()=>{
  render(<RulerCommands state={state} playerId="a" onPlayerChange={()=>{}} onOrder={()=>{}} disabled={false} focusedCityId={0}/>);
  expect(screen.getByText('预估每回合净收支 -1')).toBeInTheDocument();
  expect(screen.getByText(/治理损耗 0/)).toBeInTheDocument();
  expect(screen.getByText(/军饷 5/)).toBeInTheDocument();
});
it('prices and submits cavalry recruitment instead of charging infantry cost',()=>{
  const submit=vi.fn();render(<RulerCommands state={state} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={false} focusedCityId={0}/>);
  chooseOption(screen.getByLabelText('征募兵种'),'cavalry');
  expect(screen.getByText('本次耗资 42')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'下令并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'recruit',cityId:0,amount:6,unitType:'cavalry'}});
});

it('includes the selected available commander on a march order',()=>{
  const submit=vi.fn();const next={...state,characters:[{id:'hero',name:'曹仁',sex:'male' as const,owner:'a',ruler:false,politics:60,command:90,loyalty:80,governorCityId:null}]};
  render(<RulerCommands state={next} playerId="a" onPlayerChange={()=>{}} onOrder={submit} disabled={false} focusedCityId={0}/>);
  chooseOption(screen.getByLabelText('战略行动'),'march');
  chooseOption(screen.getByLabelText('目的郡县'),'1');
  chooseOption(screen.getByLabelText('统军将领'),'hero');
  fireEvent.click(screen.getByRole('button',{name:'下令并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'attack',fromCityId:0,toCityId:1,troops:6,commanderId:'hero'}});
});

it('submits a strategic march and disables all orders during replay',()=>{
  const submit=vi.fn();
  const props={state,playerId:'a',onPlayerChange:()=>{},onOrder:submit,focusedCityId:0};
  const view=render(<RulerCommands {...props} disabled={false}/>);
  chooseOption(screen.getByLabelText('战略行动'),'march');
  chooseOption(screen.getByLabelText('目的郡县'),'1');
  fireEvent.click(screen.getByRole('button',{name:'下令并结束回合'}));
  expect(submit).toHaveBeenCalledWith({agentId:'a',action:{type:'attack',fromCityId:0,toCityId:1,troops:6}});
  view.rerender(<RulerCommands {...props} disabled={true}/>);
  expect(screen.getByRole('button',{name:'下令并结束回合'})).toBeDisabled();
});
