import {expect,it} from 'vitest';
import type {BattleState} from './types.js';
import {resolveTurn} from './resolveTurn.js';
import {validateAction} from './rules.js';
import {kingdomOf,rankName,prestigeGain,initialCapital,collapseKingdoms} from './kingdom.js';
import {relationKey} from './diplomacy.js';
import {generateBattle} from './generate.js';

function fixture():BattleState{return {seed:'kingdom',turn:0,version:0,maxTurns:0,columns:7,rows:1,status:'active',winner:null,
  agents:[{id:'a',name:'A',color:'#fff',active:true,strategy:'balanced',startingCityId:0},{id:'b',name:'B',color:'#000',active:true,strategy:'balanced',startingCityId:6}],
  resources:{a:1000,b:1000},polities:{a:{prestige:300}},cities:Array.from({length:7},(_,id)=>({id,name:`城${id}`,x:id,z:0,adjacent:[],owner:id===6?'b':'a',troops:10,level:2,terrain:'plain',weather:'clear',defenseMultiplier:1.24,resourceTrait:null,imperial:false}))};}
it('validates founding requirements, owned initial city, name and active status',()=>{
  const s=fixture(),a={type:'found-kingdom' as const,name:'魏'};
  expect(validateAction(s,'a',a)).toEqual({ok:true});
  s.polities!.a!.prestige=299;expect(validateAction(s,'a',a).ok).toBe(false);s.polities!.a!.prestige=300;
  s.resources.a=199;expect(validateAction(s,'a',a).ok).toBe(false);s.resources.a=1000;
  s.cities[0]!.owner='b';expect(validateAction(s,'a',a).ok).toBe(false);s.cities[0]!.owner='a';
  s.cities[5]!.owner=null;expect(validateAction(s,'a',a).ok).toBe(false);s.cities[5]!.owner='a';
  for(const name of ['', 'ABCDEFG', '<魏>', '一二三四五六七'])expect(validateAction(s,'a',{...a,name}).ok).toBe(false);
  s.polities!.b={prestige:300,kingdom:{name:'魏',capitalId:6,foundedTurn:0,lastMigrationTurn:0}};
  expect(validateAction(s,'a',a).ok).toBe(false);
});
it('founds at initial city, breaks only own alliances and refunds pending alliance escrow',()=>{
  const s=fixture();s.agents.push({id:'c',name:'C',color:'#aaa',active:true,strategy:'balanced'});s.cities.push({...s.cities[6]!,id:7,owner:'c'});
  s.diplomacy={[relationKey('a','b')]:{status:'alliance',trade:true,relation:80,truceUntil:100},[relationKey('b','c')]:{status:'alliance',trade:true,relation:80,truceUntil:100}};
  s.diplomaticOffers=[{id:'offer',from:'b',to:'a',offer:40,treaty:'alliance',expiresTurn:9}];
  const r=resolveTurn(s,[{agentId:'a',action:{type:'found-kingdom',name:'魏'}}],0);
  expect(kingdomOf(r.state,'a')).toMatchObject({name:'魏',capitalId:0,foundedTurn:1});
  expect(r.state.diplomacy![relationKey('a','b')]).toMatchObject({status:'war',trade:false,truceUntil:0});
  expect(r.state.diplomacy![relationKey('b','c')]!.status).toBe('alliance');
  expect(r.state.diplomaticOffers).toEqual([]);expect(r.events.some(e=>e.type==='kingdom'&&e.amount===200)).toBe(true);
  expect(r.events.some(e=>e.type==='diplomacy'&&e.amount===40)).toBe(true);
  expect(s.polities!.a!.kingdom).toBeUndefined();
  expect(validateAction(r.state,'a',{type:'found-kingdom',name:'晋'}).ok).toBe(false);
});
it('awards victory only after forty full turns and capital loss takes precedence',()=>{
  const s=fixture();s.polities!.a!.kingdom={name:'魏',capitalId:0,foundedTurn:10,lastMigrationTurn:10};s.turn=48;
  const t39=resolveTurn(s,[],0);expect(t39.state.status).toBe('active');
  const t40=resolveTurn(t39.state,[],1);expect(t40.state.winner).toBe('a');expect(t40.state.victoryReason).toBe('kingdom');
  const lost=structuredClone(t39.state);lost.cities[0]!.owner='b';
  const r=resolveTurn(lost,[],1);expect(r.state.winner).toBeNull();expect(kingdomOf(r.state,'a')).toBeUndefined();expect(rankName(r.state,'a')).toBe('公');
  expect(r.state.polities!.a!.refoundAfterTurn).toBe(58);
});
it('capture and recapture cannot restore the country, and refounding starts a new timer',()=>{
  const s=fixture();s.turn=20;s.polities!.a!.kingdom={name:'魏',capitalId:0,foundedTurn:1,lastMigrationTurn:1};
  s.cities[0]!.owner='b';collapseKingdoms(s,()=>{});s.cities[0]!.owner='a';
  expect(kingdomOf(s,'a')).toBeUndefined();expect(s.polities!.a!.prestige).toBe(200);
  s.polities!.a!.prestige=300;expect(validateAction(s,'a',{type:'found-kingdom',name:'魏'}).ok).toBe(false);
  s.turn=28;const r=resolveTurn(s,[{agentId:'a',action:{type:'found-kingdom',name:'魏'}}],0);
  expect(kingdomOf(r.state,'a')!.foundedTurn).toBe(29);
});
it('charges relocation, rejects estates and preserves founding date',()=>{
  const s=fixture();s.turn=10;s.polities!.a!.kingdom={name:'魏',capitalId:0,foundedTurn:1,lastMigrationTurn:1};
  expect(validateAction(s,'a',{type:'move-capital',cityId:0}).ok).toBe(false);
  s.cities[1]!.siteKind='mine';expect(validateAction(s,'a',{type:'move-capital',cityId:1}).ok).toBe(false);s.cities[1]!.siteKind='city';
  s.resources.a=239;expect(validateAction(s,'a',{type:'move-capital',cityId:1}).ok).toBe(false);s.resources.a=1000;
  const r=resolveTurn(s,[{agentId:'a',action:{type:'move-capital',cityId:1}}],0);
  expect(kingdomOf(r.state,'a')).toMatchObject({capitalId:1,foundedTurn:1,lastMigrationTurn:11});
  expect(r.events.some(e=>e.type==='kingdom'&&e.amount===240)).toBe(true);
  expect(validateAction(r.state,'a',{type:'move-capital',cityId:2}).ok).toBe(false);
});
it('exposes bounded prestige sources without mutating legacy state',()=>{
  const s=fixture();delete s.polities;
  const before=JSON.stringify(s),gain=prestigeGain(s,'a');expect(gain.total).toBeGreaterThan(0);expect(gain.territory).toBe(2);
  expect(initialCapital(s,'a')?.id).toBe(0);expect(JSON.stringify(s)).toBe(before);
  const r=resolveTurn(s,[],0);expect(r.state.polities!.a!.prestige).toBeGreaterThan(0);
  expect(kingdomOf(r.state,'a')).toBeUndefined();
});
it('an actual arriving army destroys a capital on the fortieth turn before victory',()=>{
  const s=fixture();s.turn=49;s.polities!.a!.kingdom={name:'魏',capitalId:0,foundedTurn:10,lastMigrationTurn:10};
  s.armies=[{id:'invader',owner:'b',troops:200,route:[6,0],leg:0,progress:.999,speed:.7}];
  const r=resolveTurn(s,[],0);
  expect(r.events.some(e=>e.type==='capture'&&e.cityId===0)).toBe(true);
  expect(r.state.cities[0]!.owner).toBe('b');expect(r.state.status).toBe('active');
  expect(kingdomOf(r.state,'a')).toBeUndefined();expect(rankName(r.state,'a')).toBe('公');
});
it('old historical saves retain the original seat even after losing it',()=>{
  const s=generateBattle('legacy-kingdom');const id=s.agents[0]!.id,capital=initialCapital(s,id)!;
  delete s.agents[0]!.startingCityId;s.cities[capital.id]!.owner=null;
  expect(initialCapital(s,id)!.id).toBe(capital.id);
});
it('kingdoms cannot restore alliances but may negotiate peace and trade',()=>{
  const s=fixture();s.polities!.a!.kingdom={name:'魏',capitalId:0,foundedTurn:0,lastMigrationTurn:0};
  s.diplomacy={[relationKey('a','b')]:{status:'peace',trade:false,relation:80,truceUntil:0}};
  expect(validateAction(s,'b',{type:'diplomacy',targetAgentId:'a',treaty:'alliance',offer:0})).toEqual({ok:false,code:'KINGDOM_ALLIANCE_FORBIDDEN'});
  expect(validateAction(s,'b',{type:'diplomacy',targetAgentId:'a',treaty:'trade',offer:0}).ok).toBe(true);
});
