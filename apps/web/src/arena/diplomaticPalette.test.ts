import {it,expect} from 'vitest';
import {diplomaticPigment} from './diplomaticPalette';
import {generateBattle} from '../../../api/src/domain/generate';
it('distinguishes self, allies, peace and enemies without changing ownership',()=>{
 const s=generateBattle('palette');const before=JSON.stringify(s);expect(diplomaticPigment(s,'agent-1','agent-1')).toBe('#839d57');
 expect(diplomaticPigment(s,'agent-1','agent-2')).toBe('#b85d4d');expect(JSON.stringify(s)).toBe(before);
 for(const [status,color] of [['alliance','#638baf'],['peace','#bdac75']] as const){
  (s.diplomacy??={})['agent-1:agent-2']={status,relation:30,trade:false,truceUntil:0};
  const snapshot=JSON.stringify(s);
  expect(diplomaticPigment(s,'agent-1','agent-2')).toBe(color);
  expect(JSON.stringify(s)).toBe(snapshot);
 }
});
