import {expect,it} from 'vitest';
import {recruitmentActions} from './recruitment.js';
import {candidates} from './learning.js';
import {chooseAction} from './strategies.js';
import {campaignActions} from './campaign.js';
import {resolveTurn} from '../domain/resolveTurn.js';
import {relationBetween} from '../domain/diplomacy.js';
import {diplomaticInitiative} from '../domain/diplomacy.js';
import {fiscalEstimate} from '../domain/economy.js';
import {UNIT_TYPES,mergeTroops} from '../domain/troops.js';
import {recruitmentPrice} from '../domain/construction.js';
import type {BattleState} from '../domain/types.js';
function setup():BattleState{return {seed:'recruitment',version:0,turn:1,maxTurns:0,columns:4,rows:1,status:'active',winner:null,resources:{a:200,b:200},agents:[{id:'a',name:'A',color:'#fff',active:true,strategy:'defensive'},{id:'b',name:'B',color:'#000',active:true,strategy:'defensive'}],cities:[0,1,2,3].map(id=>({id,name:String(id),x:id,z:0,adjacent:id===0?[]:id===1?[2]:id===2?[1,3]:[2],owner:id===3?'b':'a',troops:id===3?20:2,level:1,terrain:'plain',weather:'clear',resourceTrait:null,imperial:false,defenseMultiplier:1.12}))};}
it('recruits at a reachable frontier and near reserve, never an isolated county',()=>{
  const s=setup(),actions=recruitmentActions(s,'a');
  expect(actions.some(a=>a.type==='recruit'&&a.cityId===2)).toBe(true);
  expect(actions.some(a=>a.type==='recruit'&&a.cityId===1)).toBe(true);
  expect(actions.some(a=>a.type==='recruit'&&a.cityId===0)).toBe(false);
});
it('does not build an unlimited garrison or recruit with no active front',()=>{
  const s=setup();s.cities[1]!.troops=100;s.cities[2]!.troops=100;
  expect(recruitmentActions(s,'a')).toEqual([]);
  s.cities[1]!.troops=2;s.cities[2]!.troops=2;s.cities[3]!.owner='a';
  expect(recruitmentActions(s,'a')).toEqual([]);
});
it('budgets occupation troops for a weak target beside a strong counterattack force',()=>{
  const s=setup();s.resources.a=10000;s.cities[2]!.troops=60;s.cities[3]!.troops=2;
  s.cities.push({...s.cities[3]!,id:4,name:'counterattack',x:4,troops:80,adjacent:[3]});s.cities[3]!.adjacent.push(4);
  const action=recruitmentActions(s,'a').find(a=>a.type==='recruit'&&a.cityId===2&&a.unitType==='spear');
  expect(action).toBeDefined();
  if(action?.type!=='recruit')throw Error('Expected occupation budget');
  mergeTroops(s.cities[2]!,{troops:action.amount,units:{spear:action.amount}});
  expect(campaignActions(s,'a').some(a=>a.type==='attack'&&a.toCityId===3)).toBe(true);
});
it('funds both a flank guard and an assault force instead of stopping below attack readiness',()=>{
  const s=setup();s.resources.a=10000;s.cities[2]!.troops=72;s.cities[3]!.troops=40;
  s.cities.push({...s.cities[3]!,id:4,name:'second enemy',x:4,adjacent:[2]});
  s.cities[2]!.adjacent.push(4);
  expect(campaignActions(s,'a').some(a=>a.type==='attack')).toBe(false);
  const recruit=recruitmentActions(s,'a').find(a=>a.type==='recruit'&&a.cityId===2&&a.unitType==='spear');
  expect(recruit).toBeDefined();
  if(recruit?.type!=='recruit')throw Error('Expected funded reinforcement');
  mergeTroops(s.cities[2]!,{troops:recruit.amount,units:{spear:recruit.amount}});
  expect(campaignActions(s,'a').some(a=>a.type==='attack')).toBe(true);
});
it('preserves twenty turns of deficit and does not recruit into a payroll crisis',()=>{
  const s=setup();s.resources.a=45;s.armies=[{id:'costly',owner:'a',troops:200,units:{cavalry:200},route:[1,2],leg:0,progress:0,speed:.7}];
  expect(recruitmentActions(s,'a')).toEqual([]);
});
it('funds the actual frontier deficit instead of an AI-only twelve-soldier cap',()=>{
  const s=setup();s.resources.a=2000;s.cities[3]!.troops=80;
  const action=recruitmentActions(s,'a').find(a=>a.type==='recruit'&&a.cityId===2&&a.unitType==='spear');
  expect(action).toMatchObject({type:'recruit',amount:142});
  s.armies=[{id:'reinforcements',owner:'a',troops:100,route:[1,2],leg:0,progress:.2,speed:.7}];
  expect(recruitmentActions(s,'a').find(a=>a.type==='recruit'&&a.cityId===2&&a.unitType==='spear')).toMatchObject({amount:42});
});
it('finds the maximum affordable deficit with rounded wages for every unit type',()=>{
  for(const money of [20,45,100,400,2000]){
    const s=setup();s.resources.a=money;s.cities[3]!.troops=80;
    const actual=recruitmentActions(s,'a');
    for(const unitType of UNIT_TYPES){
      const price=recruitmentPrice(s.cities[2]!,unitType);
      let expected=0;
      for(let amount=1;amount<=142;amount++){
        const cities=structuredClone(s.cities.filter(c=>c.owner==='a'));
        mergeTroops(cities[2]!,{troops:amount,units:{[unitType]:amount}});
        if(money-amount*price>=20+Math.max(0,-fiscalEstimate(cities).net)*20)expected=amount;
      }
      const action=actual.find(a=>a.type==='recruit'&&a.cityId===2&&a.unitType===unitType);
      expect(action?.type==='recruit'?action.amount:0).toBe(expected);
    }
  }
});
it('uses the same feasible recruitment choices in rule and learned policies',()=>{
  const s=setup();
  const learned=candidates(s,s.agents[0]!).filter(a=>a.type==='recruit');
  expect(learned.length).toBeGreaterThan(0);
  expect(learned.every(a=>a.type==='recruit'&&a.cityId!==0)).toBe(true);
  expect(chooseAction(s,s.agents[0]!)).toMatchObject({type:'recruit',cityId:2});
});
it('prepares a solvent long-peace frontier without treating it as an attack target',()=>{
  const s=setup();s.turn=28;s.cities[1]!.troops=15;
  s.diplomacy={'a:b':{status:'peace',relation:10,trade:true,truceUntil:6}};
  expect(recruitmentActions(s,'a').some(a=>a.type==='recruit'&&a.cityId===2)).toBe(true);
  expect(campaignActions(s,'a')[0]).toMatchObject({type:'move',fromCityId:1,toCityId:2});
  expect(campaignActions(s,'a').some(a=>a.type==='attack')).toBe(false);
});
it('lets a wealthy enclosed weak faction prepare without declaring a suicidal war',()=>{
  const s=setup();s.turn=28;s.resources.a=20000;s.cities[3]!.troops=200;
  s.diplomacy={'a:b':{status:'peace',relation:10,trade:true,truceUntil:6}};
  expect(recruitmentActions(s,'a').some(a=>a.type==='recruit'&&a.cityId===2)).toBe(true);
  expect(campaignActions(s,'a').some(a=>a.type==='attack')).toBe(false);
  expect(diplomaticInitiative(s,'a')).toBeUndefined();
});
it('does not stage against allies, during a truce grace period, or on behalf of a player',()=>{
  const s=setup();s.turn=28;s.cities[1]!.troops=15;
  s.diplomacy={'a:b':{status:'alliance',relation:60,trade:true,truceUntil:6}};
  expect(recruitmentActions(s,'a')).toEqual([]);
  s.diplomacy['a:b']!.status='peace';s.diplomacy['a:b']!.truceUntil=22;
  expect(recruitmentActions(s,'a')).toEqual([]);
  s.diplomacy['a:b']!.truceUntil=6;s.playerAgentId='a';
  expect(recruitmentActions(s,'a')).toEqual([]);
});
it('can leave the long-peace recruitment deadlock through legal preparation and declaration',()=>{
  let s=setup();s.turn=28;s.cities[1]!.troops=15;
  s.diplomacy={'a:b':{status:'peace',relation:10,trade:true,truceUntil:6}};
  for(let i=0;i<30&&relationBetween(s,'a','b').status==='peace';i++){
    s=resolveTurn(s,[{agentId:'a',action:chooseAction(s,s.agents[0]!)}],s.version).state;
  }
  expect(relationBetween(s,'a','b').status).toBe('war');
});
it('can prepare and legally leave an old enclosing alliance, without attacking before declaration',()=>{
  let s=setup();s.turn=49;s.cities[1]!.troops=15;
  s.diplomacy={'a:b':{status:'alliance',relation:60,trade:true,truceUntil:6}};
  expect(recruitmentActions(s,'a').some(a=>a.type==='recruit'&&a.cityId===2)).toBe(true);
  expect(campaignActions(s,'a').some(a=>a.type==='attack')).toBe(false);
  for(let i=0;i<30&&relationBetween(s,'a','b').status!=='war';i++){
    s=resolveTurn(s,[{agentId:'a',action:chooseAction(s,s.agents[0]!)}],s.version).state;
  }
  expect(relationBetween(s,'a','b').status).toBe('war');
});
