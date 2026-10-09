import {expect,it} from 'vitest';
import {personnelNotice} from './personnelNotice';
it('prioritizes family and equipment events over routine payroll, respecting owner and replay turn',()=>{
  const events=[{type:'family',agentId:'a',turn:2,message:'新生儿'},{type:'personnel',agentId:'a',turn:2,message:'俸禄'},{type:'family',agentId:'b',turn:2,message:'他人'},{type:'family',agentId:'a',turn:3,message:'未来'}];
  expect(personnelNotice(events,'a',2)).toBe('新生儿');
});
