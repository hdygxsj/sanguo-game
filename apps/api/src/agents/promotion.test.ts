import {expect,it} from 'vitest';
import {promotionDecision} from './promotion.js';
const report=(meanCounties=60)=>({games:16,horizon:120,factions:16,winRate:0,unresolvedRate:1,meanCounties,bySeat:Array.from({length:16},(_,seat)=>({seat,games:1,wins:0,unresolved:1}))});
it('rejects territorial regression even when all games are unresolved',()=>expect(promotionDecision(report(17),report()).promoted).toBe(false));
it('rejects incompatible evaluation budgets',()=>expect(promotionDecision({...report(90),horizon:60},report()).promoted).toBe(false));
it('does not replace an incumbent with an unchanged candidate',()=>expect(promotionDecision(report(),report()).promoted).toBe(false));
it('accepts clear territory improvement without pretending it is a victory',()=>expect(promotionDecision(report(70),report())).toEqual({promoted:true,reason:'territorial-improvement'}));
it('rejects loss of an incumbent faction victory',()=>{
  const old=report(),candidate=report(90);old.winRate=1/16;old.bySeat[0]!.wins=1;
  candidate.winRate=1/16;candidate.bySeat[1]!.wins=1;
  expect(promotionDecision(candidate,old).promoted).toBe(false);
});
