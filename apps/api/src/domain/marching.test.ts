import { describe, expect, it } from 'vitest';
import type { BattleState } from './types.js';
import { resolveTurn } from './resolveTurn.js';
import { validateAction } from './rules.js';
import {advanceArmies,roadRoute} from './marching.js';

function scenario(distance = 4): BattleState {
  return { seed:'march', version:0, turn:0, maxTurns:0, columns:3, rows:1, status:'active', winner:null,
    agents:[{id:'a',name:'甲',color:'#f00',strategy:'balanced',active:true},{id:'b',name:'乙',color:'#00f',strategy:'balanced',active:true}],
    resources:{a:1000,b:1000}, cities:[0,1,2].map(id=>({id,name:`城${id}`,x:id*distance,z:0,adjacent:id===1?[0,2]:[1],terrain:'plain',weather:'clear',resourceTrait:null,owner:id===0?'a':id===2?'b':null,troops:id===1?1:30,level:1,defenseMultiplier:1.12,imperial:false})) };
}
const march = (fromCityId:number,toCityId:number,troops=20) => ({type:'attack' as const,fromCityId,toCityId,troops});

describe('strategic marching',()=>{
  it('prefers a friendly reinforcement corridor over a shorter neutral shortcut',()=>{
    const state=scenario(1);
    state.cities[0]!.adjacent=[1,3];state.cities[2]!.adjacent=[1,3];state.cities[2]!.owner='a';
    state.cities.push({...state.cities[0]!,id:3,name:'friendly detour',x:1,z:4,adjacent:[0,2],troops:2});
    expect(roadRoute(state,0,2,'a')).toEqual([0,3,2]);
    const next=resolveTurn(state,[{agentId:'a',action:{type:'move',fromCityId:0,toCityId:2,troops:10}}],state.version).state;
    expect(next.armies?.[0]?.route).toEqual([0,3,2]);
    expect(next.cities[1]!.owner).toBeNull();
  });
  it('preserves the existing cross-country route when friendly counties are disconnected',()=>{
    const state=scenario(1);state.cities[2]!.owner='a';
    expect(roadRoute(state,0,2,'a')).toEqual([0,1,2]);
    state.cities[2]!.owner='b';
    expect(roadRoute(state,0,2,'a')).toEqual([0,1,2]);
  });
  it('recalls a halted army along its existing road without teleporting or losing its composition',()=>{
    const state=scenario();state.cities[1]!.owner='b';
    state.armies=[{id:'stopped',owner:'a',troops:20,units:{spear:20},route:[0,1],leg:0,progress:1,speed:.7,halted:true}];
    const action={type:'recall-army' as const,armyId:'stopped'};
    expect(validateAction(state,'a',action).ok).toBe(true);
    const next=resolveTurn(state,[{agentId:'a',action}],state.version).state;
    expect(next.armies?.[0]).toMatchObject({route:[1,0],leg:0,halted:false,troops:20,units:{spear:20}});
    expect(next.armies![0]!.progress).toBeCloseTo(.7/4);
    expect(next.cities[0]!.troops).toBe(30);
    expect(state.armies[0]!.halted).toBe(true);
    let returned=next;
    for(let i=0;i<5;i++)returned=resolveTurn(returned,[],returned.version).state;
    expect(returned.armies).toHaveLength(0);
    expect(returned.cities[0]!.troops).toBe(50);
  });
  it('rejects recall of another faction army or a lost retreat destination',()=>{
    const state=scenario();state.armies=[{id:'stopped',owner:'a',troops:20,route:[0,1],leg:0,progress:1,speed:.7,halted:true}];
    const action={type:'recall-army' as const,armyId:'stopped'};
    expect(validateAction(state,'b',action).ok).toBe(false);
    state.cities[0]!.owner='b';expect(validateAction(state,'a',action).ok).toBe(false);
  });
  it('does not turn bad-weather combat efficiency into casualties against an empty city',()=>{
    for(const weather of ['clear','rain','snow','fog','blizzard'] as const){
      const state=scenario(.1);state.cities[1]!.weather=weather;state.cities[1]!.troops=0;
      state.armies=[{id:'arrival',owner:'a',troops:20,route:[0,1],leg:0,progress:0,speed:.7}];
      advanceArmies(state,()=>{});
      expect(state.cities[1]!.owner).toBe('a');
      expect(state.cities[1]!.troops).toBe(20);
    }
  });
  it('still makes a defended rainy siege cost more troops than a clear siege',()=>{
    const survivors=['clear','rain'].map(weather=>{
      const state=scenario(.1);state.cities[1]!.weather=weather as 'clear'|'rain';state.cities[1]!.troops=10;
      state.armies=[{id:'siege',owner:'a',troops:20,route:[0,1],leg:0,progress:0,speed:.7}];
      advanceArmies(state,()=>{});return state.cities[1]!.troops;
    });
    expect(survivors).toEqual([9,7]);
  });
  it('keeps soldiers in a persistent army until distance has been travelled',()=>{
    const state=scenario();
    let next=resolveTurn(state,[{agentId:'a',action:march(0,1)}],0).state;
    expect(next.cities[1]!.owner).toBeNull();
    expect(next.armies).toHaveLength(1);
    expect(next.armies![0]!.progress).toBeCloseTo(.7/4);
    expect(next.armies![0]!.remainingTurns).toBe(5);
    for(let i=0;i<5;i++)next=resolveTurn(next,[],next.version).state;
    expect(next.cities[1]!.owner).toBe('a');
    expect(next.armies).toHaveLength(0);
    expect(state.cities[0]!.troops).toBe(30);
  });
  it('allows a road route beyond an adjacent county but rejects disconnected targets',()=>{
    const state=scenario();
    expect(validateAction(state,'a',march(0,2)).ok).toBe(true);
    state.cities[1]!.adjacent=[0];state.cities[2]!.adjacent=[];
    expect(validateAction(state,'a',march(0,2)).ok).toBe(false);
  });
  it('resolves opposing armies on the road before either reaches a city',()=>{
    const state=scenario(2);
    state.cities[1]!.owner='b';state.cities[1]!.troops=30;
    let result=resolveTurn(state,[{agentId:'a',action:march(0,1,20)},{agentId:'b',action:march(1,0,10)}],0);
    expect(result.state.armies).toHaveLength(2);
    result=resolveTurn(result.state,[],1);
    expect(result.events.some(e=>e.type==='field-battle')).toBe(true);
    expect(result.state.armies).toHaveLength(1);
    expect(result.state.armies![0]!.owner).toBe('a');
    expect(result.state.armies![0]!.troops).toBe(10);
    expect(result.state.cities[0]!.owner).toBe('a');
    expect(result.state.cities[1]!.owner).toBe('b');
  });
  it('does not eliminate a cityless faction while its field army survives',()=>{
    let state=resolveTurn(scenario(),[{agentId:'a',action:march(0,1)}],0).state;
    state.cities[0]!.owner='b';
    state=resolveTurn(state,[],state.version).state;
    expect(state.agents[0]!.active).toBe(true);
    expect(state.status).toBe('active');
  });
  it('charges wages and applies desertion to field armies as well as garrisons',()=>{
    let state=resolveTurn(scenario(),[{agentId:'a',action:march(0,1)}],0).state;
    state.cities[0]!.owner='b';state.resources.a=0;
    const result=resolveTurn(state,[],state.version);
    expect(result.state.armies![0]!.troops).toBeLessThan(20);
    expect(result.state.resources.a).toBe(0);
    expect(result.events.some(e=>e.type==='upkeep'&&e.agentId==='a')).toBe(true);
  });
  it('handles overtaking enemies without applying the destination fortification bonus',()=>{
    const state=scenario(4);
    state.cities[1]!.defenseMultiplier=100;
    state.armies=[
      {id:'fast',owner:'a',troops:20,route:[0,1],leg:0,progress:.1,speed:2},
      {id:'slow',owner:'b',troops:8,route:[0,1],leg:0,progress:.3,speed:.4},
    ];
    const result=resolveTurn(state,[],0);
    expect(result.events.filter(e=>e.type==='field-battle')).toHaveLength(1);
    expect(result.state.armies).toHaveLength(1);
    expect(result.state.armies![0]!.troops).toBe(12);
  });
  it('settles a simultaneous junction encounter before any siege',()=>{
    const state=scenario(.7);
    state.cities[1]!.troops=1;
    const result=resolveTurn(state,[{agentId:'a',action:march(0,1,20)},{agentId:'b',action:march(2,1,10)}],0);
    expect(result.events.filter(e=>e.type==='field-battle')).toHaveLength(1);
    expect(result.events.findIndex(e=>e.type==='field-battle')).toBeLessThan(result.events.findIndex(e=>e.type==='attack'));
    expect(result.state.cities[1]!.owner).toBe('a');
    expect(result.state.armies).toHaveLength(0);
  });
  it('passes intermediate friendly cities and conserves all troops',()=>{
    const state=scenario(.3); state.cities[1]!.owner='a';state.cities[2]!.owner='a';
    const result=resolveTurn(state,[{agentId:'a',action:{type:'move',fromCityId:0,toCityId:2,troops:20}}],0);
    expect(result.state.cities.map(c=>c.troops)).toEqual([10,1,50]);
    expect(result.state.armies).toHaveLength(0);
  });
});
