import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {GameSelect} from './GameSelect';
it('uses a searchable custom menu and never a native select',()=>{
  const change=vi.fn();const {container}=render(<GameSelect aria-label="将领" value="a" onChange={change}><option value="a">曹操</option><option value="b">关羽</option><option value="c" disabled>被俘</option></GameSelect>);
  expect(container.querySelector('select')).toBeNull();
  fireEvent.click(screen.getByRole('combobox',{name:'将领'}));
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'关'}});
  fireEvent.click(screen.getByRole('option',{name:'关羽'}));
  expect(change).toHaveBeenCalledWith({target:{value:'b'}});expect(screen.queryByRole('listbox')).toBeNull();
});
it('supports keyboard choice, escape and disabled fieldsets',()=>{
  const change=vi.fn();const view=render(<GameSelect aria-label="将领" value="a" onChange={change}><option value="a">曹操</option><option value="b">关羽</option></GameSelect>);
  fireEvent.keyDown(screen.getByRole('combobox'),{key:'ArrowDown'});
  fireEvent.keyDown(screen.getByRole('searchbox'),{key:'ArrowDown'});
  fireEvent.keyDown(screen.getByRole('searchbox'),{key:'Enter'});
  expect(change).toHaveBeenCalledWith({target:{value:'b'}});
  view.rerender(<fieldset disabled><GameSelect aria-label="将领" value="a"><option value="a">曹操</option></GameSelect></fieldset>);
  fireEvent.click(screen.getByRole('combobox'));expect(screen.queryByRole('listbox')).toBeNull();
});
