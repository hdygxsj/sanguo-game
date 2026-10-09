import {chooseOption} from './testSelect';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {PersonnelPanel} from './PersonnelPanel';
import {generateBattle} from '../../api/src/domain/generate';

it('exposes family and equipment as explicit working sections',()=>{
  const state=generateBattle('personnel-tabs'),diplomacy=vi.fn();
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={()=>{}} onDiplomacy={diplomacy}/>);
  fireEvent.click(screen.getByRole('tab',{name:'婚姻子嗣'}));
  expect(screen.getByLabelText('婚配对象')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'前往外交联姻'}));expect(diplomacy).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('tab',{name:'兵器坐骑'}));
  expect(screen.getByLabelText('寻访购置')).toBeVisible();expect(screen.getByText('坐骑：未装备')).toBeVisible();
});

it('appoints a named officer through the ruler order pipeline',()=>{
  const state=generateBattle('panel',7,5,2),submit=vi.fn();
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  chooseOption(screen.getByLabelText('选择人物'),'person-1-1');
  const city=state.cities.find(c=>c.owner==='agent-1')!;
  chooseOption(screen.getByLabelText('任职城池'),String(city.id));
  fireEvent.click(screen.getByRole('button',{name:'任命太守 · 10'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'appoint-governor',characterId:'person-1-1',cityId:city.id}});
});
it('disables all orders in replay and explains missing legacy rosters',()=>{
  const state=generateBattle('panel',7,5,2),submit=vi.fn();
  const view=render(<PersonnelPanel state={state} playerId="agent-1" disabled={true} onOrder={submit}/>);
  expect(screen.getByRole('button',{name:'任命太守 · 10'})).toBeDisabled();
  delete state.characters;
  view.rerender(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  expect(screen.getByText(/此旧存档尚未启用人物系统/)).toBeInTheDocument();
});
it('labels deployed commanders accurately and prevents appointing them as governors',()=>{
  const state=generateBattle('panel',7,5,2);state.armies=[{id:'army',owner:'agent-1',troops:20,commanderId:'person-1-1',route:[0,1],leg:0,progress:0,speed:.7}];
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
  fireEvent.click(screen.getByLabelText('选择人物'));
  expect(screen.getByRole('option',{name:'荀彧 · 领军 · 忠诚 75'})).toBeInTheDocument();
  chooseOption(screen.getByLabelText('选择人物'),'person-1-1');
  expect(screen.getByText('正在领军，不能兼任太守。')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'任命太守 · 10'})).toBeDisabled();
});
it('labels children as dependants rather than idle officers',()=>{
  const state=generateBattle('child-panel',7,5,2);state.characters![0]!.ageYears=0;state.characters![0]!.ruler=false;
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
  fireEvent.click(screen.getByLabelText('选择人物'));
  expect(screen.getByRole('option',{name:'曹操 · 未成年 · 忠诚 100'})).toBeInTheDocument();
  expect(screen.getByText('任职：家族抚养')).toBeInTheDocument();
  expect(screen.getByText('未满 18 岁，不能任职。')).toBeInTheDocument();
});
it('shows the selected adult portrait and an explicit fallback for missing or failed artwork',()=>{
  const state=generateBattle('portrait-panel',7,5,2);
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
  expect(screen.getByRole('img',{name:'曹操原创立绘'})).toHaveAttribute('src','/images/portraits/cao-cao-v1.jpg');
  chooseOption(screen.getByLabelText('选择人物'),'person-1-2');
  const image=screen.getByRole('img',{name:'卞夫人原创立绘'});
  expect(image).toHaveAttribute('src','/images/portraits/lady-bian-v1.jpg');
  fireEvent.error(image);
  expect(screen.getByText('立绘暂不可用')).toBeInTheDocument();
  chooseOption(screen.getByLabelText('选择人物'),'person-1-1');
  expect(screen.getByRole('img',{name:'荀彧原创立绘'})).toBeInTheDocument();
});
it('does not use an adult portrait for a child with a matching name',()=>{
  const state=generateBattle('child-art',7,5,2);state.characters![0]!.ageYears=0;
  render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={()=>{}}/>);
  expect(screen.queryByRole('img',{name:'曹操原创立绘'})).not.toBeInTheDocument();
  expect(screen.getByText('幼年人物')).toBeInTheDocument();
});
it('appoints a central officer with a real paid order and disables commands in replay',()=>{
  const state=generateBattle('court-panel',7,5,2),submit=vi.fn();state.resources['agent-1']=300;
  const view=render(<PersonnelPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  chooseOption(screen.getByLabelText('选择人物'),'person-1-1');
  fireEvent.click(screen.getByText('中央官位'));
  fireEvent.click(screen.getByRole('button',{name:'任命丞相 · 80'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'appoint-court',characterId:'person-1-1',office:'chancellor'}});
  view.rerender(<PersonnelPanel state={state} playerId="agent-1" disabled={true} onOrder={submit}/>);
  expect(screen.getByRole('button',{name:'任命丞相 · 80'})).toBeDisabled();
});
