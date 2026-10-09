import { fireEvent, render, screen,waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { BattleWorkspace } from './BattleWorkspace';
import type { BattleDetail } from './types';
import {generateBattle} from '../../api/src/domain/generate';

vi.mock('./arena/ArenaScene', () => ({ ArenaScene: ({state,onCityAction,onSelectCity,onSelectArmy}: {state:BattleDetail['state'];onCityAction:(kind:string,id:number)=>void;onSelectCity:(id:number)=>void;onSelectArmy:(id:string)=>void}) => <div data-testid="arena-canvas"><button onClick={()=>onCityAction('develop',state.cities.find(c=>c.owner===state.playerAgentId)!.id)}>测试地图建设入口</button>{!!state.armies?.length&&<><button onClick={()=>onSelectArmy(state.armies![0]!.id)}>测试军旗入口</button><button onClick={()=>onSelectCity(state.cities.find(c=>c.owner===state.playerAgentId&&c.id!==state.armies![0]!.route[0])!.id)}>测试行军目标</button></>}</div> }));

const battle: BattleDetail = {
  id: 'battle-1', title: '群雄逐鹿', seed: 'seed', status: 'active', currentTurn: 0, maxTurns: 30,
  columns: 5, rows: 4, version: 0, updatedAt: new Date().toISOString(),
  agents: [
    { id: 'a1-record', agentKey: 'agent-1', name: 'Agent A', color: '#7257ff', strategy: 'expansion', active: true },
    { id: 'a2-record', agentKey: 'agent-2', name: 'Agent B', color: '#e05472', strategy: 'defensive', active: true },
  ],
  state: {
    seed: 'seed', version: 0, turn: 0, maxTurns: 30, columns: 5, rows: 4, status: 'active', winner: null,
    agents: [
      { id: 'agent-1', name: 'Agent A', color: '#7257ff', strategy: 'expansion', active: true },
      { id: 'agent-2', name: 'Agent B', color: '#e05472', strategy: 'defensive', active: true },
    ],
    resources: { 'agent-1': 20, 'agent-2': 20 },
    cities: [],
  },
};

describe('battle workspace', () => {
  it('takes an army selection and map target before confirming its march through HTTP',async()=>{
    const state={...generateBattle('map-army-order'),playerAgentId:'agent-1'};
    const home=state.cities.find(c=>c.owner==='agent-1')!,target=state.cities.find(c=>c.owner==='agent-1'&&c.id!==home.id)!;
    state.armies=[{id:'selected-army',owner:'agent-1',troops:6,route:[home.id,home.id],leg:0,progress:0,speed:.7,persistent:true,halted:true,stance:'camp'}];
    vi.spyOn(api,'getBattle').mockResolvedValue({battle:{...battle,state}});
    const execute=vi.spyOn(api,'executeTurn').mockResolvedValue({state:{...state,version:1,turn:1},events:[]});
    render(<BattleWorkspace battleId="battle-1" onBack={()=>{}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'测试军旗入口'}));
    fireEvent.click(screen.getByRole('button',{name:'行军'}));
    fireEvent.click(screen.getByRole('button',{name:'测试行军目标'}));
    expect(execute).not.toHaveBeenCalled();expect(screen.queryByLabelText('战略行动')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'确认行军并结束回合'}));
    await waitFor(()=>expect(execute).toHaveBeenCalledWith('battle-1',0,{agentId:'agent-1',action:{type:'order-army',armyId:'selected-army',toCityId:target.id}}));
  });
  it('opens the selected city construction form directly from the map without advancing the turn',async()=>{
    const state={...generateBattle('contextual-command'),playerAgentId:'agent-1'};
    vi.spyOn(api,'getBattle').mockResolvedValue({battle:{...battle,state}});
    const execute=vi.spyOn(api,'executeTurn');
    render(<BattleWorkspace battleId="battle-1" onBack={()=>{}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'测试地图建设入口'}));
    expect(screen.getByRole('complementary',{name:'城池建设'})).toBeInTheDocument();
    expect(screen.queryByLabelText('战略行动')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:/扩建城池/})).toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
  });
  it('shows historical personnel rather than current personnel during replay',async()=>{
    const person={id:'p',name:'荀彧',sex:'male' as const,owner:'agent-1',ruler:false,politics:88,command:70,loyalty:90,governorCityId:null};
    vi.spyOn(api,'getBattle').mockResolvedValue({battle:{...battle,state:{...battle.state,turn:1,version:1,playerAgentId:'agent-1',characters:[person]}}});
    vi.spyOn(api,'replay').mockResolvedValue({snapshot:{...battle.state,characters:[{...person,loyalty:40}]},events:[]});
    render(<BattleWorkspace battleId="battle-1" onBack={()=>{}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'回放'}));
    fireEvent.change(screen.getByRole('slider',{name:'回放回合'}),{target:{value:'0'}});
    await screen.findByText('T-0');
    fireEvent.click(screen.getByRole('button',{name:'人物'}));
    expect(screen.getByRole('meter',{name:'人物忠诚'})).toHaveAttribute('value','40');
    expect(screen.getByRole('button',{name:'赏赐安抚 · 15'})).toBeDisabled();
  });
  beforeEach(() => {
    vi.spyOn(api, 'getBattle').mockResolvedValue({ battle });
  });

  it('renders the realtime battlefield controls and agents', async () => {
    render(<BattleWorkspace battleId="battle-1" onBack={() => undefined} />);

    expect(await screen.findByRole('heading',{name:'群雄逐鹿',level:1})).toBeInTheDocument();
    expect(screen.getByTestId('arena-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '推进一回合' })).toBeInTheDocument();
    expect(screen.queryByText('Agent A')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider',{name:'回放回合'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'势力'}));
    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.getByText('Agent B')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'事件'}));
    expect(screen.queryByText('Agent A')).not.toBeInTheDocument();
    expect(screen.getByText('等待首轮指令')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'回放'}));
    expect(screen.getByRole('slider',{name:'回放回合'})).toBeInTheDocument();
    fireEvent.keyDown(window,{key:'Escape'});
    expect(screen.queryByRole('slider',{name:'回放回合'})).not.toBeInTheDocument();
  });
  it('sends the chosen ruler command to the turn API rather than leaving control with the AI',async()=>{
    const execute=vi.spyOn(api,'executeTurn').mockResolvedValue({state:{...battle.state,version:1,turn:1,playerAgentId:'agent-1'},events:[]});
    render(<BattleWorkspace battleId="battle-1" onBack={()=>{}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'君主'}));
    fireEvent.click(screen.getByRole('button',{name:'扮演 Agent A'}));
    fireEvent.click(screen.getByRole('button',{name:'确认身份并开始执政'}));
    await waitFor(()=>expect(execute).toHaveBeenCalledWith('battle-1',0,{agentId:'agent-1',action:{type:'hold'}}));
    expect(screen.getByRole('button',{name:'开启自动推演'})).toBeDisabled();
  });
});
