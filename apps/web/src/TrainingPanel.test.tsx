import {render,screen} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {TrainingPanel} from './TrainingPanel';
afterEach(()=>vi.unstubAllGlobals());
it('shows a running external evaluation and disables duplicate starts',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'running',completed:32,total:32,phase:'incumbent-evaluation',evaluationProgress:{completed:34,total:96,seat:1,trained:true,turn:200,horizon:500}})}));
  render(<TrainingPanel/>);
  expect(await screen.findByRole('button',{name:'训练进行中…'})).toBeDisabled();
  expect(screen.getByText('旧策略评估 · 34 / 96 对局 · 席位 2 · 学习策略 · 200 / 500 回合')).toBeInTheDocument();
  expect(screen.getByRole('progressbar',{name:'旧策略评估进度'})).toHaveAttribute('value','34');
});
it('reports a terminated worker as failed rather than indefinitely running',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'failed',completed:4,total:32,error:'训练进程已退出，未完成评测'})}));
  render(<TrainingPanel/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('训练进程已退出，未完成评测');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
