import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {WorkspaceBoundary} from './WorkspaceBoundary';
it('offers recovery instead of a blank page when a lazy workspace module fails',()=>{
  const error=vi.spyOn(console,'error').mockImplementation(()=>{}),reload=vi.fn();
  function Broken():never{throw Error('Failed to fetch dynamically imported module');}
  try{
    render(<WorkspaceBoundary onReload={reload}><Broken/></WorkspaceBoundary>);
    fireEvent.click(screen.getByRole('button',{name:'刷新并重新加载'}));
    expect(reload).toHaveBeenCalledOnce();
  }finally{error.mockRestore();}
});
