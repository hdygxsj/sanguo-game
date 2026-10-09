import {it,expect} from 'vitest';
import {generateBattle} from './generate.js';
import {validateAction} from './rules.js';
import {resolveTurn} from './resolveTurn.js';
import {characterBudget} from './characters.js';
import {commandMultiplier,captureCommander} from './commanders.js';
const fixture=()=>{const s=generateBattle('court',7,5,2,0);s.resources['agent-1']=300;return s;};

it('appoints a unique court officer through real orders and charges an appointment fee',()=>{
  const s=fixture();
  const result=resolveTurn(s,[{agentId:'agent-1',action:{type:'appoint-court',characterId:'person-1-1',office:'chancellor'}}],s.version);
  expect(result.state.court?.['agent-1']?.chancellor).toBe('person-1-1');
  expect(result.events.some(e=>e.type==='personnel'&&e.amount===80&&e.message.includes('丞相'))).toBe(true);
  expect(s.court).toBeUndefined();
  expect(validateAction(result.state,'agent-1',{type:'appoint-court',characterId:'person-1-2',office:'chancellor'}).ok).toBe(false);
});
it('accounts for court salaries and removes captured officials benefits',()=>{
  const s=fixture(),base=characterBudget(s,'agent-1');
  s.court={'agent-1':{chancellor:'person-1-1'}};
  const staffed=characterBudget(s,'agent-1');
  expect(staffed.salary).toBe(base.salary+3);
  expect(staffed.revenue).toBeGreaterThan(base.revenue);
  s.characters!.find(p=>p.id==='person-1-1')!.capturedBy='agent-2';
  expect(characterBudget(s,'agent-1').revenue).toBe(base.revenue);
});
it('enforces ownership adulthood loyalty funds and incompatible duties',()=>{
  const s=fixture(),p=s.characters!.find(p=>p.id==='person-1-1')!;
  const action={type:'appoint-court' as const,characterId:p.id,office:'marshal' as const};
  p.ageYears=15;expect(validateAction(s,'agent-1',action).ok).toBe(false);p.ageYears=30;
  p.loyalty=20;expect(validateAction(s,'agent-1',action).ok).toBe(false);p.loyalty=75;
  expect(validateAction(s,'agent-2',action).ok).toBe(false);
  p.governorCityId=s.cities.find(c=>c.owner==='agent-1')!.id;
  expect(validateAction(s,'agent-1',action).ok).toBe(false);p.governorCityId=null;
  s.resources['agent-1']=0;expect(validateAction(s,'agent-1',action).ok).toBe(false);
});
it('applies marshal command support only while the marshal can serve',()=>{
  const s=fixture(),army={id:'a',owner:'agent-1',troops:20,route:[0,1],leg:0,progress:0,speed:.7};
  const base=commandMultiplier(s,army);s.court={'agent-1':{marshal:'person-1-1'}};
  expect(commandMultiplier(s,army)).toBeGreaterThan(base);
  captureCommander(s,{...army,commanderId:'person-1-1'},'agent-2',()=>{});
  expect(commandMultiplier(s,army)).toBe(base);
});
