import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {NewCampaign} from './NewCampaign';
it('lets the player choose a ruler before creating the campaign',()=>{
  const start=vi.fn();render(<NewCampaign busy={false} onStart={start} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:/选择刘备/}));
  expect(start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'开始征途'}));
  expect(start).toHaveBeenCalledWith('agent-2');
});
it('allows observation without assigning a ruler',()=>{
  const start=vi.fn();render(<NewCampaign busy={false} onStart={start} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'旁观天下'}));
  fireEvent.click(screen.getByRole('button',{name:'开始观战'}));
  expect(start).toHaveBeenCalledWith(undefined);
});
