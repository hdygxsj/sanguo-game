import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {ArmyCommands} from './ArmyCommands';
import {generateBattle} from '../../api/src/domain/generate';
it('selects an independent army before requesting a map target and sends only its identity',()=>{
 const state=generateBattle('army-ui');const city=state.cities.find(c=>c.owner==='agent-1')!;const target=state.cities.find(c=>c.id!==city.id&&c.owner==='agent-1')!;
 state.armies=[{id:'field',owner:'agent-1',troops:6,route:[city.id,city.id],leg:0,progress:0,speed:.7,halted:true,persistent:true,stance:'camp'}];
 const order=vi.fn(),intent=vi.fn(),select=vi.fn();const props={state,playerId:'agent-1',disabled:false,selectedArmyId:'field',onSelectArmy:select,onOrder:order,intent:null as 'march'|'field'|'raise'|null,onIntent:intent,targetId:null as number|null};
 const {rerender}=render(<ArmyCommands {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'行军'}));expect(intent).toHaveBeenCalledWith('march');expect(order).not.toHaveBeenCalled();
 rerender(<ArmyCommands {...props} intent="march" targetId={target.id}/>);
 fireEvent.click(screen.getByRole('button',{name:'确认行军并结束回合'}));expect(order).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'order-army',armyId:'field',toCityId:target.id}});
 expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('recruits hundred-person companies into the chosen army from unit cards',()=>{
 const state=generateBattle('army-recruits');state.resources['agent-1']=1000;const city=state.cities.find(c=>c.owner==='agent-1')!;
 state.armies=[{id:'field',owner:'agent-1',troops:6,route:[city.id,city.id],leg:0,progress:0,speed:.7,halted:true,persistent:true,stance:'camp'}];
 const order=vi.fn();render(<ArmyCommands state={state} playerId="agent-1" disabled={false} selectedArmyId="field" onSelectArmy={()=>{}} onOrder={order} intent={null} onIntent={()=>{}} targetId={null}/>);
 fireEvent.click(screen.getByRole('button',{name:'征募与补员'}));fireEvent.click(screen.getByRole('button',{name:/招募弓兵 100 人/}));
 expect(order).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'recruit-army',armyId:'field',amount:1,unitType:'archer'}});
 expect(screen.queryByLabelText('经营郡县')).not.toBeInTheDocument();
});
