import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {CaptivesPanel} from './CaptivesPanel';
import {generateBattle} from '../../api/src/domain/generate';
it('offers persuasion/release only for captives held by the player and disables replay orders',()=>{
  const state=generateBattle('captives',7,5,2);state.characters![4]!.capturedBy='agent-1';const submit=vi.fn();
  const view=render(<CaptivesPanel state={state} playerId="agent-1" disabled={false} onOrder={submit}/>);
  fireEvent.click(screen.getByRole('button',{name:'劝降 · 10'}));
  expect(submit).toHaveBeenCalledWith({agentId:'agent-1',action:{type:'recruit-captive',characterId:'person-2-1'}});
  view.rerender(<CaptivesPanel state={state} playerId="agent-1" disabled={true} onOrder={submit}/>);
  expect(screen.getByRole('button',{name:'释放'})).toBeDisabled();
});
