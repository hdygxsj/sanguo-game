import {render,screen,fireEvent,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {CampaignHud} from './CampaignHud';
import {generateBattle} from '../../api/src/domain/generate';
it('puts season/resources in the faction cluster and keeps turn controls separate from top navigation',()=>{
 const state=generateBattle('hud');state.turn=5;const open=vi.fn(),turn=vi.fn();
 render(<CampaignHud state={state} playerId="agent-1" panel={null} onPanel={open} onBack={()=>{}} onTurn={turn} busy={false} locked={false} autoRun={false} onAuto={()=>{}}/>);
 expect(screen.getByLabelText('势力概况')).toHaveTextContent('第 2 年 · 夏');
 const nav=screen.getByRole('navigation',{name:'战局工具'});fireEvent.click(within(nav).getByRole('button',{name:'外交'}));expect(open).toHaveBeenCalledWith('diplomacy');
 expect(within(nav).queryByRole('button',{name:'推进一回合'})).not.toBeInTheDocument();
 fireEvent.click(within(screen.getByLabelText('回合控制')).getByRole('button',{name:'推进一回合'}));expect(turn).toHaveBeenCalled();
});
it('disables turn changes in replay while allowing menus',()=>{
 const state=generateBattle('hud-lock');render(<CampaignHud state={state} playerId={null} panel="agents" onPanel={()=>{}} onBack={()=>{}} onTurn={()=>{}} busy={false} locked autoRun={false} onAuto={()=>{}}/>);
 expect(screen.getByRole('button',{name:'推进一回合'})).toBeDisabled();expect(screen.getByRole('button',{name:'开启自动推演'})).toBeDisabled();expect(screen.getByRole('button',{name:'势力'})).toHaveAttribute('aria-expanded','true');
});
