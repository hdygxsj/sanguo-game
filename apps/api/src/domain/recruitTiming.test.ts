import {expect,it} from 'vitest';
import type {BattleState,AgentAction} from './types.js';
import {resolveTurn} from './resolveTurn.js';

function scenario():BattleState {
  return {seed:'recruit-timing',version:0,turn:0,maxTurns:0,columns:4,rows:1,status:'active',winner:null,
    agents:['a','b'].map(id=>({id,name:id,color:'#fff',strategy:'balanced',active:true})),resources:{a:2000,b:2000},
    cities:[0,1,2,3].map(id=>({id,name:String(id),x:id*.1,z:0,adjacent:id===0?[1]:id===1?[0]:[],owner:id===0||id===2?'a':'b',
      troops:id===0?70:id===1?33:2,units:{sword:id===0?70:id===1?33:2},level:1,defenseMultiplier:1.12,terrain:'plain',weather:'clear',resourceTrait:null,imperial:false}))};
}
const attack:AgentAction={agentId:'a',action:{type:'attack',fromCityId:0,toCityId:1,troops:59}};
const recruit:AgentAction={agentId:'b',action:{type:'recruit',cityId:1,amount:129,unitType:'sword'}};

it('does not let 129 same-turn recruits change a siege against 33 defenders, regardless of seat order',()=>{
  for(const reverse of [false,true]){
    const s=scenario();if(reverse)s.agents.reverse();
    const baseline=resolveTurn(s,[attack],0),result=resolveTurn(s,[attack,recruit],0);
    expect(result.state.cities[1]).toEqual(baseline.state.cities[1]);
    expect(result.state.cities[1]!.owner).toBe('a');
    expect(result.state.resources.b).toBe(baseline.state.resources.b);
    expect(result.events.some(e=>e.type==='recruit'&&e.message.includes('取消'))).toBe(true);
    expect(s.cities[1]!.troops).toBe(33);
  }
});
it('musters recruits after a surviving defense, ready for the next turn',()=>{
  const s=scenario();s.cities[0]!.troops=20;s.cities[0]!.units={sword:20};
  const small:AgentAction={agentId:'a',action:{type:'attack',fromCityId:0,toCityId:1,troops:10}};
  const baseline=resolveTurn(s,[small],0),result=resolveTurn(s,[small,recruit],0);
  expect(result.state.cities[1]!.troops).toBe(baseline.state.cities[1]!.troops+129);
  expect(result.state.cities[1]!.units?.sword).toBe(result.state.cities[1]!.troops);
  expect(result.events.findIndex(e=>e.type==='recruit')).toBeGreaterThan(result.events.findIndex(e=>e.type==='attack'));
  expect(result.state.resources.b).toBeLessThan(baseline.state.resources.b-129*4);
});
