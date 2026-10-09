import {it,expect} from 'vitest';
import {trainingProgress} from './trainingProgress';
it('shows evaluation progress rather than a finished training bar',()=>{
  const p=trainingProgress({completed:32,total:32,phase:'candidate-evaluation',evaluationProgress:{completed:7,total:96,seat:3,trained:false,turn:125,horizon:500}});
  expect(p).toMatchObject({label:'候选策略评估进度',value:7,max:96});
  expect(p.text).toContain('7 / 96');expect(p.text).toContain('125 / 500');expect(p.text).toContain('规则对照');
});
it('distinguishes incumbent evaluation and saving from successful completion',()=>{
  expect(trainingProgress({completed:32,total:32,phase:'incumbent-evaluation'}).text).toContain('旧策略评估');
  expect(trainingProgress({completed:32,total:32,phase:'saving'}).text).toContain('保存');
  expect(trainingProgress({completed:32,total:32}).text).toContain('正在独立评测');
  expect(trainingProgress({completed:2,total:32,phase:'training'})).toMatchObject({value:2,max:32,label:'训练进度'});
});
