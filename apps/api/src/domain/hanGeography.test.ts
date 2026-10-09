import { describe,it,expect } from 'vitest';
import { generateBattle } from './generate.js';
import { HAN_REGISTER } from './hanRegister.js';
import { chooseLearned, learn, newPolicy } from '../agents/learning.js';
import { validateAction } from './rules.js';
import { resolveTurn } from './resolveTurn.js';
import { onLand } from './chinaMap.js';
import {historicGeography} from './hanGeography.js';

describe('national county map and learned policy',()=>{
  it('includes the entire imported register without disconnected or duplicate county identities',()=>{
    const state=historicGeography(()=>.5);
    expect(state.cities).toHaveLength(1184);
    expect(state.map?.commanderies).toHaveLength(105);
    expect(new Set(state.cities.map(c=>c.province)).size).toBe(13);
    expect(state.cities.filter(c=>!onLand(c.x,c.z))).toEqual([]);
    expect(new Set(state.cities.map(c=>`${c.commandery}/${c.name}`)).size).toBe(1184);
    HAN_REGISTER.forEach((r,i)=>{
      expect(state.cities.filter(c=>c.commanderyId===i).map(c=>c.name).sort()).toEqual([...r.counties].sort());
    });
    const visited=new Set<number>([0]); const queue=[0];
    for(let i=0;i<queue.length;i++) for(const n of state.cities[queue[i]!]!.adjacent){
      expect(state.cities[n]!.adjacent).toContain(queue[i]);
      if(!visited.has(n)){visited.add(n);queue.push(n);}
    }
    expect(visited.size).toBe(1184);
  });
  it('updates numeric weights from a transition and always chooses legal actions',()=>{
    let state=generateBattle('learning',7,5,4,10);
    const policy=newPolicy();
    const before=[...policy.weights];
    for(let i=0;i<10;i++){
      const agent=state.agents[0]!;
      const action=chooseLearned(state,agent,policy,1,()=>.3);
      expect(validateAction(state,agent.id,action).ok).toBe(true);
      const next=resolveTurn(state,[{agentId:agent.id,action}],state.version).state;
      learn(policy,state,next,agent,action);state=next;
    }
    expect(policy.weights.every(Number.isFinite)).toBe(true);
    expect(policy.weights).not.toEqual(before);
  });
  it('accepts both factions orders before advancing armies and resolving arrivals',()=>{
    const state=generateBattle('ownership');
    const a=state.agents[0]!, b=state.agents[1]!;
    const source=state.cities.find(c=>c.owner===a.id)!;
    const target=state.cities[source.adjacent[0]!]!;
    target.owner=b.id;target.troops=1;source.troops=100;
    target.x=source.x+.2;target.z=source.z;
    const result=resolveTurn(state,[{agentId:a.id,action:{type:'attack',fromCityId:source.id,toCityId:target.id,troops:80}},
      {agentId:b.id,action:{type:'recruit',cityId:target.id,amount:4}}],0);
    expect(result.events.some(e=>e.agentId===b.id&&e.type==='recruit')).toBe(true);
    expect(result.events.findIndex(e=>e.type==='recruit')).toBeGreaterThan(result.events.findIndex(e=>e.type==='capture'));
    expect(result.events.find(e=>e.type==='recruit')?.message).toContain('取消');
    expect(result.state.cities[target.id]!.owner).toBe(a.id);
  });
});
