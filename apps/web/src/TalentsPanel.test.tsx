import {chooseOption} from './testSelect';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {generateBattle} from '../../api/src/domain/generate';
import {TalentsPanel} from './TalentsPanel';

it('shows neutral talent costs and submits a paid recruitment order',()=>{
  const state=generateBattle('talents-ui',7,5,16),submit=vi.fn();state.resources['agent-1']=200;
  const view=render(<TalentsPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  const person=state.characters!.find(p=>p.name==='诸葛亮')!;
  chooseOption(screen.getByLabelText('在野人物'),person.id);
  fireEvent.click(screen.getByRole('button',{name:'礼聘入仕 · 89'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'recruit-character',characterId:person.id}});
  state.resources['agent-1']=0;
  view.rerender(<TalentsPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  expect(screen.getByRole('button',{name:'礼聘入仕 · 89'})).toBeDisabled();
});
it('lets players search and recruit generated officers with their own generic portrait',()=>{
 const state=generateBattle('random-recruit',7,5,16),submit=vi.fn();state.resources['agent-1']=1000;
 const person=state.characters!.find(p=>p.origin==='generated')!;
 render(<TalentsPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
 fireEvent.click(screen.getByLabelText('在野人物'));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'随机武将'}});
 expect(screen.getAllByRole('option')).toHaveLength(6);
 fireEvent.click(screen.getByRole('option',{name:new RegExp(person.name)}));
 expect(screen.getByRole('img',{name:`${person.name}大众脸`})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/礼聘入仕/}));
 expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'recruit-character',characterId:person.id}});
});
