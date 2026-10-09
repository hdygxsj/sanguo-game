import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {characterBudget,personnelInitiative} from './characters.js';
import {availableCommanders} from './commanders.js';

function fixture(){const s=generateBattle('personnel',7,5,16);s.resources['agent-1']=100;return s;}
it('preserves the strongest available commander across wartime governor appointments',()=>{
  let s=fixture();s.resources['agent-1']=1000;
  s.diplomacy={}; // Missing relations use the existing war default.
  const best=availableCommanders(s,'agent-1').sort((a,b)=>b.command-a.command)[0]!;
  for(const turn of [7,14,21]){
    s.turn=turn;const action=personnelInitiative(s,'agent-1');
    if(action){expect(validateAction(s,'agent-1',action).ok).toBe(true);s=resolveTurn(s,[{agentId:'agent-1',action}],s.version).state;}
    expect(availableCommanders(s,'agent-1').some(p=>p.id===best.id)).toBe(true);
  }
});
it('gives every historical faction a unique ruler and mixed named staff',()=>{
  const s=fixture();expect(s.characters!.filter(c=>c.owner!==null)).toHaveLength(48);
  expect(new Set(s.characters!.map(c=>c.id)).size).toBe(s.characters!.length);
  expect(s.characters!.some(c=>c.sex==='female')).toBe(true);
  for(const a of s.agents)expect(s.characters!.filter(c=>c.owner===a.id&&c.ruler)).toHaveLength(1);
});
it('offers major male and female figures as paid neutral recruits without altering original staff',()=>{
  const s=fixture();
  for(const name of ['张飞','诸葛亮','周瑜','司马懿','孙权','黄月英','孙尚香','大乔','小乔','蔡琰'])expect(s.characters!.find(c=>c.name===name)).toMatchObject({owner:null,ruler:false});
  const person=s.characters!.find(c=>c.name==='诸葛亮')!;
  const action={type:'recruit-character' as const,characterId:person.id};
  s.resources['agent-1']=1000;
  expect(validateAction(s,'agent-1',action).ok).toBe(true);
  const next=resolveTurn(s,[{agentId:'agent-1',action}],s.version).state;
  expect(next.characters!.find(c=>c.id===person.id)).toMatchObject({owner:'agent-1',loyalty:55});
  expect(validateAction(next,'agent-2',action).ok).toBe(false);
  expect(next.resources['agent-1']).toBeLessThan(resolveTurn(s,[],s.version).state.resources['agent-1']!);
  s.resources['agent-1']=0;expect(validateAction(s,'agent-1',action).ok).toBe(false);
});
it('recruits a capable neutral administrator only when staff are occupied and payroll is affordable',()=>{
  const s=fixture();s.turn=7;s.resources['agent-1']=1000;
  // An expanded realm has more offices than its starting staff can fill.
  for(const city of s.cities.filter(c=>!c.owner).slice(0,4))city.owner='agent-1';
  const cities=s.cities.filter(c=>c.owner==='agent-1'&&c.terrain!=='blocked');
  expect(cities.length).toBeGreaterThan(3);
  s.characters!.filter(c=>c.owner==='agent-1').forEach((p,i)=>{p.governorCityId=cities[i]!.id;});
  for(const city of cities)city.troops=2;
  const action=personnelInitiative(s,'agent-1');
  expect(action).toMatchObject({type:'recruit-character'});
  expect(validateAction(s,'agent-1',action!).ok).toBe(true);
  s.resources['agent-1']=90;expect(personnelInitiative(s,'agent-1')).toBeUndefined();
  s.resources['agent-1']=1000;for(const city of cities)city.troops=10000;
  expect(personnelInitiative(s,'agent-1')).toBeUndefined();
});
it('does not hire redundant staff or automate the player personnel choices',()=>{
  const s=fixture();s.turn=7;s.resources['agent-1']=1000;
  expect(personnelInitiative(s,'agent-1')?.type).toBe('appoint-governor');
  s.playerAgentId='agent-1';expect(personnelInitiative(s,'agent-1')).toBeUndefined();
});
it('appoints atomically, charges the order and prevents duplicate or foreign appointments',()=>{
  const s=fixture(),c=s.characters!.find(c=>c.owner==='agent-1'&&!c.ruler)!,city=s.cities.find(c=>c.owner==='agent-1')!;
  const action={type:'appoint-governor' as const,characterId:c.id,cityId:city.id};
  expect(validateAction(s,'agent-2',action).ok).toBe(false);
  const next=resolveTurn(s,[{agentId:'agent-1',action}],0).state;
  expect(next.characters!.find(p=>p.id===c.id)!.governorCityId).toBe(city.id);
  expect(c.governorCityId).toBeNull();
  expect(validateAction(next,'agent-1',action).ok).toBe(false);
  const other=next.characters!.find(p=>p.owner==='agent-1'&&p.id!==c.id)!;
  expect(validateAction(next,'agent-1',{...action,characterId:other.id}).ok).toBe(false);
  const budget=characterBudget(next,'agent-1');expect(budget.salary).toBe(4);expect(budget.revenue).toBeGreaterThan(0);
  const hold=resolveTurn(s,[],0).state;
  expect(next.resources['agent-1']!-hold.resources['agent-1']!).toBe(-10+budget.revenue-1);
});
it('removes lost offices before revenue and lowers loyalty without gifting an officer to the conqueror',()=>{
  const s=fixture(),c=s.characters![1]!,city=s.cities.find(c=>c.owner===c.owner)!;
  c.governorCityId=city.id;city.owner='agent-2';const loyalty=c.loyalty;
  expect(characterBudget(s,c.owner!).revenue).toBe(0);
  const result=resolveTurn(s,[],0);const after=result.state.characters!.find(p=>p.id===c.id)!;
  expect(after.governorCityId).toBeNull();expect(after.owner).toBe(c.owner);expect(after.loyalty).toBeLessThan(loyalty);
});
it('unpaid low-loyalty officers resign, rulers remain and rewards cost money',()=>{
  const s=fixture(),officer=s.characters![1]!;officer.loyalty=5;
  for(const city of s.cities)if(city.owner==='agent-1')city.troops=10000;
  s.resources['agent-1']=15;
  const result=resolveTurn(s,[],0);expect(result.state.characters![1]!.owner).toBeNull();
  expect(result.state.characters![0]!.owner).toBe('agent-1');
  const rewarded=resolveTurn(s,[{agentId:'agent-1',action:{type:'reward-character',characterId:officer.id}}],0);
  expect(rewarded.state.characters![1]!.owner).toBe('agent-1');
  expect(rewarded.state.characters![1]!.loyalty).toBe(8);
  s.resources['agent-1']=14;
  expect(validateAction(s,'agent-1',{type:'reward-character',characterId:officer.id}).ok).toBe(false);
});
it('leaves legacy saves without characters untouched and lets AI use valid personnel actions',()=>{
  const s=fixture();s.turn=7;
  const action=personnelInitiative(s,'agent-1');expect(action).toBeDefined();expect(validateAction(s,'agent-1',action!).ok).toBe(true);
  delete s.characters;expect(resolveTurn(s,[],0).state.characters).toBeUndefined();expect(characterBudget(s,'agent-1')).toEqual({salary:0,revenue:0});
});
