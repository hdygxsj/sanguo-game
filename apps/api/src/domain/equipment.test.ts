import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {effectiveAttributes} from './equipment.js';
import {captureCommander,commandMultiplier} from './commanders.js';
import {remainingMarchTurns} from './marching.js';
const owner='agent-1';
function fixture(){const s=generateBattle('gear',7,5,2);s.resources[owner]=1000;return s;}
it('purchases a unique item once, deducts its price and leaves earlier snapshots unchanged',()=>{
  const s=fixture(),base=resolveTurn(s,[],0).state;
  const next=resolveTurn(s,[{agentId:owner,action:{type:'buy-equipment',templateId:'red-hare'}}],0).state;
  expect(next.equipment).toHaveLength(1);expect(next.resources[owner]!-base.resources[owner]!).toBe(-120);
  expect(s.equipment??[]).toHaveLength(0);
  expect(validateAction(next,'agent-2',{type:'buy-equipment',templateId:'red-hare'}).ok).toBe(false);
});
it('swaps same-slot items without cloning and rejects foreign, captured and marching bearers',()=>{
  const s=fixture();s.equipment=[{id:'x',templateId:'iron-sword',owner,bearerId:'person-1-1'},{id:'y',templateId:'seven-star',owner}];
  const action={type:'equip-equipment' as const,characterId:'person-1-1',itemId:'y'};
  expect(validateAction(s,'agent-2',action).ok).toBe(false);
  const next=resolveTurn(s,[{agentId:owner,action}],0).state;
  expect(next.equipment!.find(i=>i.id==='x')!.bearerId).toBeUndefined();expect(next.equipment!.find(i=>i.id==='y')!.bearerId).toBe('person-1-1');
  const removed=resolveTurn(next,[{agentId:owner,action:{type:'unequip-equipment',characterId:'person-1-1',slot:'weapon'}}],1).state;
  expect(removed.equipment).toHaveLength(2);expect(removed.equipment!.every(i=>i.bearerId===undefined)).toBe(true);
  s.characters![1]!.capturedBy='agent-2';expect(validateAction(s,owner,action).ok).toBe(false);
  delete s.characters![1]!.capturedBy;s.armies=[{id:'army',owner,troops:10,commanderId:'person-1-1',route:[0,1],leg:0,progress:0,speed:.7}];
  expect(validateAction(s,owner,action).ok).toBe(false);
});
it('changes effective stats without mutating base attributes and caps command advantage',()=>{
  const s=fixture(),person=s.characters![1]!;person.command=98;
  s.equipment=[{id:'x',templateId:'seven-star',owner,bearerId:person.id}];
  expect(effectiveAttributes(s,person).command).toBe(100);expect(person.command).toBe(98);
  expect(commandMultiplier(s,{id:'a',owner,commanderId:person.id,troops:10,route:[0,1],leg:0,progress:0,speed:.7})).toBe(1.2);
});
it('mounts improve continuous marching and ETA, captured gear becomes captor property',()=>{
  const s=fixture(),person=s.characters![1]!;s.cities[0]!.x=0;s.cities[0]!.z=0;s.cities[1]!.x=7;s.cities[1]!.z=0;
  delete s.map; // This unit test uses a synthetic seven-unit flat road.
  s.cities[1]!.weather='clear';
  const army={id:'a',owner,commanderId:person.id,troops:10,route:[0,1],leg:0,progress:0,speed:.7};
  expect(remainingMarchTurns(s,army)).toBe(10);
  s.equipment=[{id:'horse',templateId:'red-hare',owner,bearerId:person.id}];
  expect(remainingMarchTurns(s,army)).toBe(9);
  s.armies=[army];
  expect(resolveTurn(s,[],0).state.armies![0]!.progress).toBeCloseTo(.115);
  captureCommander(s,army,'agent-2',()=>{});
  expect(s.equipment[0]).toEqual({id:'horse',templateId:'red-hare',owner:'agent-2'});
  expect(remainingMarchTurns(s,army)).toBe(10);
});
