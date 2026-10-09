import {expect,it} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import {familyInitiative} from './familyInitiative.js';
import {resolveTurn} from '../domain/resolveTurn.js';
import {validateAction} from '../domain/rules.js';
import {chooseAction} from './strategies.js';
import {chooseLearned,newPolicy} from './learning.js';
const setup=()=>{const s=generateBattle('family-ai',7,5,2,0);s.turn=17;s.resources['agent-1']=150;return s;};
it('routes domestic marriage through both rule and learned hybrid policies',()=>{
  const s=setup(),agent=s.agents[0]!;
  const expected=familyInitiative(s,agent.id);
  expect(expected?.type).toBe('form-union');
  expect(chooseAction(s,agent)).toEqual(expected);
  expect(chooseLearned(s,agent,newPolicy())).toEqual(expected);
});
it('chooses a legal domestic marriage without changing state',()=>{const s=setup(),before=structuredClone(s);const action=familyInitiative(s,'agent-1');expect(action).toMatchObject({type:'form-union',kind:'spouse',personId:'person-1-0',partnerId:'person-1-2'});expect(validateAction(s,'agent-1',action!).ok).toBe(true);expect(s).toEqual(before);});
it('never takes over the player or drains a low treasury',()=>{const s=setup();s.playerAgentId='agent-1';expect(familyInitiative(s,'agent-1')).toBeUndefined();delete s.playerAgentId;s.resources['agent-1']=119;expect(familyInitiative(s,'agent-1')).toBeUndefined();});
it('sends a player-target marriage to escrow rather than moving their officer',()=>{const s=setup();s.characters=s.characters!.filter(p=>p.id!=='person-1-2');s.playerAgentId='agent-2';const action=familyInitiative(s,'agent-1');expect(action).toMatchObject({type:'diplomacy',targetAgentId:'agent-2',marriage:{partnerId:'person-2-2'}});const next=resolveTurn(s,[{agentId:'agent-1',action:action!}],s.version).state;expect(next.diplomaticOffers?.some(o=>o.marriage)).toBe(true);expect(next.characters!.find(c=>c.id==='person-2-2')!.owner).toBe('agent-2');expect(next.unions).toBeUndefined();});
it('does not select a minor for either domestic or diplomatic marriage',()=>{const s=setup();for(const p of s.characters!)if(p.sex==='female')p.ageYears=10;expect(familyInitiative(s,'agent-1')).toBeUndefined();});
