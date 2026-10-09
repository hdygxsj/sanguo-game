import {expect,it} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import * as curriculum from './curriculum.js';
it('alternates which side of the endgame the learner controls',()=>{
  const full=generateBattle('curriculum-side',7,5,16,0);
  const odd=curriculum.endgameScenario(full,1,18);
  expect(odd.cities.at(-1)!.owner).toBe(full.agents[1]!.id);
  expect(odd.cities[0]!.owner).not.toBe(full.agents[1]!.id);
});
it('creates a connected training-only endgame with valid local indices and two live factions',()=>{
  const full=generateBattle('curriculum-fixture',7,5,16,0),before=structuredClone(full);
  const local=curriculum.endgameScenario(full,6,18);
  expect(full).toEqual(before);
  expect(local.cities).toHaveLength(18);
  expect(local.agents.filter(a=>a.active)).toHaveLength(2);
  expect(local.agents[6]!.active).toBe(true);
  expect(local.map).toBeUndefined();
  expect(local.maxTurns).toBe(0);
  const seen=new Set([0]),queue=[0];
  for(let i=0;i<queue.length;i++)for(const id of local.cities[queue[i]!]!.adjacent){
    expect(local.cities[id]!.id).toBe(id);if(!seen.has(id)){seen.add(id);queue.push(id);}
  }
  expect(seen.size).toBe(18);
  expect(local.cities.every(c=>local.agents.some(a=>a.active&&a.id===c.owner))).toBe(true);
  expect(local.characters?.every(c=>local.agents.some(a=>a.active&&a.id===c.owner))).toBe(true);
  expect(curriculum.endgameScenario(full,6,18)).toEqual(local);
});
