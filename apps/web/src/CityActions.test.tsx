import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {CityActions} from './CityActions';
it('offers actionable city commands without submitting a turn until reviewed',()=>{
  const choose=vi.fn();render(<CityActions cityId={8} owned playerId="agent-1" disabled={false} onAction={choose}/>);
  expect(screen.queryByRole('button',{name:'征兵'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'建设'}));expect(choose).toHaveBeenCalledWith('develop',8);
  fireEvent.click(screen.getByRole('button',{name:'查看军队'}));expect(choose).toHaveBeenCalledWith('march',8);
});
it('explains observation and prevents commands during replay',()=>{
  const choose=vi.fn();const {rerender}=render(<CityActions cityId={2} owned={false} playerId={null} disabled={false} onAction={choose}/>);
  expect(screen.getByText(/观战/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'选择君主'}));expect(choose).toHaveBeenCalledWith('role',2);
  rerender(<CityActions cityId={2} owned={false} playerId="agent-1" disabled onAction={choose}/>);
  expect(screen.getByRole('button',{name:'查看军队'})).toBeDisabled();
});
