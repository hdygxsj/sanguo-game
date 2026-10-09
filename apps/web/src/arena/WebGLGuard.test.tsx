import {act,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {WebGLGuard} from './WebGLGuard';
afterEach(()=>vi.restoreAllMocks());
it('does not mount the 3D scene when Chrome cannot create WebGL2',()=>{
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  render(<WebGLGuard fallback={<button>平面地图</button>}><div>三维场景</div></WebGLGuard>);
  expect(screen.getByText('平面地图')).toBeInTheDocument();
  expect(screen.queryByText('三维场景')).not.toBeInTheDocument();
});
it('catches asynchronous renderer creation failure after a successful probe',()=>{
  const loseContext=vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({getExtension:()=>({loseContext})} as unknown as WebGL2RenderingContext);
  render(<WebGLGuard fallback={<button>平面地图</button>}><div>三维场景</div></WebGLGuard>);
  expect(screen.getByText('三维场景')).toBeInTheDocument();
  const e=new Event('unhandledrejection',{cancelable:true});Object.defineProperty(e,'reason',{value:Error('Error creating WebGL context.')});
  act(()=>window.dispatchEvent(e));
  expect(screen.getByText('平面地图')).toBeInTheDocument();
  expect(e.defaultPrevented).toBe(true);
  expect(loseContext).toHaveBeenCalledOnce();
});
