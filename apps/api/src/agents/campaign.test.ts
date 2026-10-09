import {expect,it} from 'vitest';
import type {BattleState} from '../domain/types.js';
import {campaignActions,flankGarrison} from './campaign.js';
import {chooseAction} from './strategies.js';
import {resolveTurn} from '../domain/resolveTurn.js';
import {candidates} from './learning.js';
function state():BattleState{return {seed:'logistics',version:3,turn:3,maxTurns:0,columns:4,rows:1,status:'active',winner:null,resources:{a:100,b:100},agents:[{id:'a',name:'A',color:'#fff',strategy:'economic',active:true},{id:'b',name:'B',color:'#000',strategy:'defensive',active:true}],cities:[0,1,2,3].map(id=>({id,name:String(id),x:id,z:0,adjacent:[id-1,id+1].filter(n=>n>=0&&n<4),terrain:'plain',weather:'clear',resourceTrait:null,owner:id<3?'a':'b',troops:id===0?30:id===3?20:2,level:1,defenseMultiplier:1.12,imperial:false}))};}
it('dispatches rear reserves through friendly roads directly to the frontier',()=>expect(campaignActions(state(),'a')[0]).toMatchObject({type:'move',fromCityId:0,toCityId:2,troops:28}));
it('recovers stranded armies before dispatching new forces',()=>{
  const s=state();s.armies=[{id:'stranded',owner:'a',troops:12,route:[2,3],leg:0,progress:1,speed:.7,halted:true}];
  expect(campaignActions(s,'a')[0]).toEqual({type:'recall-army',armyId:'stranded'});
});
it('keeps long reinforcements on the road instead of teleporting to the front',()=>{
  const s=state(),action=campaignActions(s,'a')[0]!;
  const next=resolveTurn(s,[{agentId:'a',action}],s.version).state;
  expect(next.cities[2]!.troops).toBe(2);
  expect(next.armies?.[0]).toMatchObject({route:[0,1,2],troops:28,leg:0});
});
it('keeps the reinforcement destination via a friendly detour around a neutral shortcut',()=>{
  const s=state();s.cities[1]!.x=20;s.cities[1]!.z=20;
  s.cities.push(...[4,5,6].map(id=>({...s.cities[1]!,id,name:String(id),x:(id-3)*.4,z:0,owner:id===6?null:'a',troops:2,adjacent:[]})));
  s.cities[0]!.adjacent=[1,4];s.cities[1]!.adjacent=[0,2];s.cities[2]!.adjacent=[1,3,6];
  s.cities[4]!.adjacent=[0,5];s.cities[5]!.adjacent=[4,6];s.cities[6]!.adjacent=[5,2];
  // Equal hop-depth fronts 2 and 5: assigned front 2 has a much shorter
  // physical route through neutral 6 than through friendly mountain road 1.
  const action=campaignActions(s,'a').find(a=>a.type==='move'&&a.fromCityId===0);
  expect(action).toMatchObject({toCityId:2});
  const next=resolveTurn(s,[{agentId:'a',action:action!}],s.version).state;
  expect(next.armies?.[0]?.route).toEqual([0,1,2]);
});
it('does not launch an attack that cannot beat the garrison',()=>expect(campaignActions(state(),'a').some(a=>a.type==='attack')).toBe(false));
it('reserves defenders against an enemy already marching to the departure county',()=>{
  const s=state();s.cities[2]!.troops=60;s.cities[3]!.troops=2;
  s.armies=[{id:'incoming-enemy',owner:'b',troops:60,route:[3,2],leg:0,progress:.5,speed:.7}];
  expect(flankGarrison(s,s.cities[2]!,3,'a')).toBe(54);
  const action=campaignActions(s,'a').find(a=>a.type==='attack'&&a.toCityId===3);
  expect(action).toMatchObject({troops:6});
});
it('does not occupy a county about to receive a stronger hostile army',()=>{
  const s=state();s.cities[2]!.troops=60;s.cities[3]!.troops=2;
  s.armies=[{id:'enemy-reinforcement',owner:'b',troops:80,route:[0,3],leg:0,progress:.5,speed:.7}];
  expect(campaignActions(s,'a').some(a=>a.type==='attack'&&a.toCityId===3)).toBe(false);
});
it('ignores friendly and halted incoming armies when estimating defense',()=>{
  const s=state();
  s.armies=[{id:'friend',owner:'a',troops:80,route:[0,2],leg:0,progress:.5,speed:.7},
    {id:'halted-enemy',owner:'b',troops:80,route:[3,2],leg:0,progress:.5,speed:.7,halted:true}];
  expect(flankGarrison(s,s.cities[2]!,3,'a')).toBe(0);
});
it('does not treat a peaceful army as an incoming attack',()=>{
  const s=state();s.armies=[{id:'peaceful',owner:'b',troops:80,route:[3,2],leg:0,progress:.5,speed:.7}];
  s.diplomacy={'a:b':{status:'peace',relation:10,trade:false,truceUntil:10}};
  expect(flankGarrison(s,s.cities[2]!,3,'a')).toBe(0);
});
it('does not empty a rear county that an enemy army is approaching',()=>{
  const s=state();s.armies=[{id:'raid',owner:'b',troops:28,route:[3,2,1,0],leg:2,progress:.9,speed:.7}];
  expect(campaignActions(s,'a').find(a=>a.type==='move'&&a.fromCityId===0)).toMatchObject({troops:4});
});
it('retains defenders against marching enemies during a frontier rally',()=>{
  const s=state();
  s.cities[0]!.adjacent=[1,3];s.cities[1]!.adjacent=[0,3];s.cities[2]!.adjacent=[];s.cities[3]!.adjacent=[0,1];
  s.cities[0]!.troops=20;s.cities[1]!.troops=20;s.cities[3]!.troops=20;
  s.armies=[{id:'attack',owner:'b',troops:20,route:[3,1],leg:0,progress:.5,speed:.7}];
  expect(campaignActions(s,'a').some(a=>a.type==='move'&&a.fromCityId===1)).toBe(false);
});
it('does not capture a weak county with survivors too few to resist its hostile neighbour',()=>{
  const s=state();s.cities[2]!.troops=60;s.cities[3]!.troops=2;
  s.cities.push({...s.cities[3]!,id:4,name:'counterattack',x:4,troops:80,adjacent:[3]});s.cities[3]!.adjacent.push(4);
  expect(campaignActions(s,'a').some(a=>a.type==='attack'&&a.toCityId===3)).toBe(false);
  s.cities[2]!.troops=140;
  expect(campaignActions(s,'a').some(a=>a.type==='attack'&&a.toCityId===3)).toBe(true);
});
it('does not treat stationary neutral garrisons as a counterattack threat',()=>{
  const s=state();s.cities[2]!.troops=60;
  s.cities.push({...s.cities[3]!,id:4,name:'neutral',x:4,troops:100,owner:null,adjacent:[2]});
  s.cities[2]!.adjacent.push(4);
  expect(campaignActions(s,'a').find(a=>a.type==='attack'&&a.toCityId===3)).toMatchObject({troops:51});
});
it('keeps enough troops to defend against a different hostile neighbour when attacking',()=>{
  const s=state();s.cities[2]!.troops=60;s.cities[3]!.troops=40;
  s.cities.push({...s.cities[3]!,id:4,name:'weak target',x:4,troops:2,adjacent:[2]});
  s.cities[2]!.adjacent.push(4);
  const attack=campaignActions(s,'a').find(a=>a.type==='attack'&&a.toCityId===4);
  expect(attack).toBeDefined();
  if(attack?.type!=='attack')throw Error('Expected attack');
  expect((60-attack.troops)*s.cities[2]!.defenseMultiplier).toBeGreaterThan(40*.85);
});
it('learned military choices preserve the same safe rally routes as campaign planning',()=>{
  const s=state();
  const military=candidates(s,s.agents[0]!).filter(a=>a.type==='attack'||a.type==='move');
  expect(military).toEqual(campaignActions(s,'a'));
  expect(military).toHaveLength(1);
});
it('learned policy does not duplicate committed reinforcements or offer doomed attacks',()=>{
  const s=state();s.armies=[{id:'incoming',owner:'a',troops:20,route:[0,1,2],leg:0,progress:.2,speed:.7}];
  expect(candidates(s,s.agents[0]!).filter(a=>a.type==='attack'||a.type==='move')).toEqual([]);
});
it('combines adjacent stalled frontiers while retaining a defensive garrison',()=>{
  const s=state();
  s.cities[0]!.adjacent=[1,3];s.cities[1]!.adjacent=[0,3];s.cities[2]!.adjacent=[];s.cities[3]!.adjacent=[0,1];
  s.cities[0]!.troops=20;s.cities[1]!.troops=20;s.cities[3]!.troops=20;
  const action=campaignActions(s,'a')[0];
  expect(action).toMatchObject({type:'move',fromCityId:1,toCityId:0,troops:12});
});
it('sends a rally across the friendly corridor instead of bouncing at a nearer frontier',()=>{
  const s=state();
  s.cities=[0,1,2,3,4,5].map(id=>({...s.cities[0]!,id,name:String(id),x:id,
    owner:id>=4?'b':'a',troops:[24,2,2,20,30,100][id]!,
    adjacent:([[1,4],[0,2],[1,3],[2,5],[0],[3]] as number[][])[id]!}));
  // Sending 3 -> 2 stops beside the original front; the rear planner then
  // sends those reserves straight back to 3. Keep the rally destination.
  // Use a modest second front so it can contribute troops without attacking.
  s.cities[5]!.troops=30;
  const action=campaignActions(s,'a').find(a=>a.type==='move'&&a.fromCityId===3)!;
  expect(action).toMatchObject({toCityId:0,troops:8});
  let next=resolveTurn(s,[{agentId:'a',action}],s.version).state;
  expect(next.armies?.[0]).toMatchObject({route:[3,2,1,0],troops:8});
  expect(next.cities[0]!.troops).toBe(24);
  for(let i=0;i<12&&next.armies?.length;i++)next=resolveTurn(next,[],next.version).state;
  expect(next.armies).toHaveLength(0);
  expect(next.cities[0]!.troops).toBe(32);
  expect(next.cities[2]!.troops).toBe(2);
});
it('rallies a stalled theatre even while a disconnected theatre can attack',()=>{
  const s=state();
  s.cities=[0,1,2,3,4].map(id=>({...s.cities[0]!,id,name:String(id),x:id,
    owner:id===1||id===4?'b':'a',troops:id===0?100:id===1?2:20,
    adjacent:([[1],[0],[3,4],[2,4],[2,3]] as number[][])[id]!}));
  const actions=campaignActions(s,'a');
  expect(actions.some(a=>a.type==='attack'&&a.fromCityId===0)).toBe(true);
  expect(actions.find(a=>a.type==='move'&&a.fromCityId===3)).toMatchObject({toCityId:2,troops:12});
  expect(actions.some(a=>a.type==='move'&&a.fromCityId===0)).toBe(false);
});
it('keeps rallying toward the frontier with committed incoming strength',()=>{
  const s=state();
  s.cities[0]!.adjacent=[1,3];s.cities[1]!.adjacent=[0,3];s.cities[2]!.adjacent=[];s.cities[3]!.adjacent=[0,1];
  s.cities[0]!.troops=20;s.cities[1]!.troops=20;s.cities[3]!.troops=30;
  s.armies=[{id:'committed',owner:'a',troops:15,route:[2,1],leg:0,progress:.2,speed:.7}];
  // Do not reverse direction and drain the destination while its reinforcements travel.
  expect(campaignActions(s,'a').some(a=>a.type==='move'&&a.fromCityId===1)).toBe(false);
});
it('breaks a frontier-only stalemate through actual marching and combat',()=>{
  let s=state();
  s.cities[0]!.adjacent=[1,3];s.cities[1]!.adjacent=[0,3];s.cities[2]!.adjacent=[];s.cities[3]!.adjacent=[0,1];
  s.cities[0]!.troops=20;s.cities[1]!.troops=20;s.cities[3]!.troops=20;
  for(let i=0;i<30&&s.status==='active';i++){
    s=resolveTurn(s,[{agentId:'a',action:campaignActions(s,'a')[0]??{type:'hold'}}],s.version).state;
  }
  expect(s.cities[3]!.owner).toBe('a');
  expect(s.winner).toBe('a');
});
it('avoids sending another army to a frontier already receiving reinforcements',()=>{const s=state();s.armies=[{id:'a1',owner:'a',troops:10,route:[0,1,2],leg:0,progress:.5,speed:.7}];expect(campaignActions(s,'a')).toHaveLength(0);});
it('lets an economic ruler attack an adequately prepared frontier',()=>{const s=state();s.cities[2]!.troops=60;expect(chooseAction(s,s.agents[0]!)).toMatchObject({type:'attack',fromCityId:2,toCityId:3});});
it('concentrates troops over real marching turns and captures the defended city',()=>{
  let s=state();s.cities[0]!.troops=80;
  for(let turn=0;turn<18&&s.status==='active';turn++)s=resolveTurn(s,[{agentId:'a',action:chooseAction(s,s.agents[0]!)}],s.version).state;
  expect(s.cities[3]!.owner).toBe('a');
  expect(s.winner).toBe('a');
});
