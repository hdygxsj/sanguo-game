import {expect,it} from 'vitest';
import {generateBattle} from '../domain/generate.js';
import {BUILDING_TYPES} from '../domain/construction.js';
import {fiscalEstimate} from '../domain/economy.js';
import {investmentContext,investmentReturn,completedInvestmentValue} from './investment.js';

it('matches actual fiscal deltas across tax thresholds and every development branch',()=>{
  const state=generateBattle('investment-accounting',7,5,2,0),owner='agent-1';
  for(const count of [1,16,17,40,80,500]){
    state.cities.forEach((c,i)=>{c.owner=i<count?owner:null;delete c.buildings;});
    const own=state.cities.filter(c=>c.owner===owner),before=fiscalEstimate(own),context=investmentContext(state,owner);
    for(const building of [...BUILDING_TYPES,undefined]){
      const city=own[0]!,snapshot=structuredClone(city),prediction=investmentReturn(city,building,context);
      expect(city).toEqual(snapshot);
      const next=structuredClone(own);
      if(building)next[0]!.buildings={[building]:1};else next[0]!.level++;
      expect(prediction.income).toBe(fiscalEstimate(next).net-before.net);
    }
    const noBuildings=completedInvestmentValue(state,owner);
    own[0]!.buildings={market:2,barracks:1};
    expect(completedInvestmentValue(state,owner)-noBuildings).toBeCloseTo((fiscalEstimate(own).net-before.net)*.08);
  }
});
