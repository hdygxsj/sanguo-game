import {fireEvent,screen} from '@testing-library/react';
export function chooseOption(control:HTMLElement,value:string){
  if(control.getAttribute('aria-expanded')!=='true')fireEvent.click(control);
  const option=screen.getAllByRole('option').find(o=>o.getAttribute('data-value')===value);
  if(!option)throw new Error(`Missing option ${value}`);
  fireEvent.click(option);
}
