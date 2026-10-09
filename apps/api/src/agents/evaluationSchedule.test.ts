import {it,expect} from 'vitest';
import {evaluationSchedule} from './evaluationSchedule.js';

it('tests each faction in the same worlds with equal exposure',()=>{
  const schedule=evaluationSchedule(48,16);
  expect(schedule).toHaveLength(48);
  for(let world=0;world<3;world++){
    const block=schedule.slice(world*16,(world+1)*16);
    expect(new Set(block.map(g=>g.seed)).size).toBe(1);
    expect(block.map(g=>g.seat)).toEqual(Array.from({length:16},(_,i)=>i));
  }
  expect(new Set(schedule.map(g=>g.seed)).size).toBe(3);
  expect(evaluationSchedule(48,16)).toEqual(schedule);
});
it('rejects partial faction blocks rather than biasing exposure',()=>{
  expect(()=>evaluationSchedule(17,16)).toThrow('UNBALANCED_EVALUATION_BUDGET');
  expect(()=>evaluationSchedule(0,16)).toThrow();
  expect(()=>evaluationSchedule(16,1)).toThrow();
});
