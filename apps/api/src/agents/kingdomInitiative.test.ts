import {it,expect} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import {chooseAction} from './strategies.js';
import {chooseLearned,newPolicy,features} from './learning.js';
it('both policies can found a kingdom by the same rules without changing learned feature dimensions',()=>{
  const s=generateBattle('kingdom-ai',7,5,2),a=s.agents[0]!;s.turn=30;s.resources[a.id]=1000;s.polities={[a.id]:{prestige:300}};
  s.cities.filter(c=>!c.owner&&c.terrain!=='blocked').slice(0,4).forEach(c=>c.owner=a.id);
  expect(chooseAction(s,a)).toEqual({type:'found-kingdom',name:'魏'});
  expect(chooseLearned(s,a,newPolicy())).toEqual({type:'found-kingdom',name:'魏'});
  expect(features(s,a,{type:'found-kingdom',name:'魏'})).toHaveLength(23);
});
