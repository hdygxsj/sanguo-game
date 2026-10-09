import {it,expect} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import {courtInitiative} from './courtInitiative.js';
import {validateAction} from '../domain/rules.js';
import {chooseAction} from './strategies.js';
import {chooseLearned,newPolicy} from './learning.js';
const fixture=()=>{
  const s=generateBattle('court-ai',7,5,2,0);s.turn=11;s.resources['agent-1']=1000;
  for(const p of s.characters??[])if(p.owner==='agent-1'){p.politics=100;p.loyalty=100;}
  return s;
};
it('selects a legal profitable office without mutating the world',()=>{
  const s=fixture(),before=JSON.stringify(s),a=courtInitiative(s,'agent-1');
  expect(a?.type).toBe('appoint-court');
  expect(validateAction(s,'agent-1',a!).ok).toBe(true);
  expect(JSON.stringify(s)).toBe(before);
});
it('reserves cash and never controls the player or takes serving governors',()=>{
  const s=fixture();s.resources['agent-1']=80;expect(courtInitiative(s,'agent-1')).toBeUndefined();
  s.resources['agent-1']=1000;s.playerAgentId='agent-1';expect(courtInitiative(s,'agent-1')).toBeUndefined();
  delete s.playerAgentId;
  for(const p of s.characters??[])if(p.owner==='agent-1')p.governorCityId=0;
  expect(courtInitiative(s,'agent-1')).toBeUndefined();
});
it('does not appoint unproductive civil officials in peacetime',()=>{
  const s=fixture();s.diplomacy={'agent-1:agent-2':{status:'peace',relation:0,trade:false,truceUntil:0}};
  for(const p of s.characters??[])if(p.owner==='agent-1')p.politics=10;
  expect(courtInitiative(s,'agent-1')).toBeUndefined();
});
it('shares appointments between rule and learned policies',()=>{
  const s=fixture(),agent=s.agents[0]!;
  expect(chooseAction(s,agent)).toEqual(courtInitiative(s,agent.id));
  expect(chooseLearned(s,agent,newPolicy())).toEqual(courtInitiative(s,agent.id));
});
it('does not consume the last wartime commander with a civil appointment',()=>{
  const s=fixture();s.diplomacy={};
  const city=s.cities.find(c=>c.owner==='agent-1')!;
  for(const p of s.characters??[])if(p.owner==='agent-1'&&p.id!=='person-1-1')p.governorCityId=city.id;
  const action=courtInitiative(s,'agent-1');
  expect(action).toMatchObject({type:'appoint-court',office:'marshal',characterId:'person-1-1'});
});
