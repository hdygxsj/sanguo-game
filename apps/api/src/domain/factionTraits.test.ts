import {it,expect} from 'vitest';
import {generateBattle} from './generate.js';
import {HISTORICAL_FACTIONS} from './factions.js';
import {factionTrait,factionBonus} from './factionTraits.js';
import {resolveTurn} from './resolveTurn.js';
it('provides a distinct named trait for all sixteen factions and a neutral fallback',()=>{
  expect(new Set(HISTORICAL_FACTIONS.map(f=>factionTrait(f.name).name)).size).toBe(16);
  expect(factionTrait('Unknown').name).toBe('自立诸侯');
});
it('applies income and upkeep bonuses in real settlement, not just descriptions',()=>{
  const s=generateBattle('traits',7,5,16),owner=s.agents[0]!.id;
  s.cities.find(c=>c.owner===owner&&!c.seat)!.siteKind='farm';
  const bonus=factionBonus(s,owner);expect(bonus.total).toBeGreaterThan(0);
  const neutral=structuredClone(s);neutral.agents[0]!.name='Unknown';
  const a=resolveTurn(s,[],0),b=resolveTurn(neutral,[],0);
  expect(a.state.resources[owner]!-b.state.resources[owner]!).toBe(bonus.total);
  expect(a.events.some(e=>e.type==='faction-bonus'&&e.agentId===owner)).toBe(true);
});
it('uses the same normalized troop composition as military upkeep for legacy saves',()=>{
  const s=generateBattle('legacy-rebate',7,5,2),id='agent-2',owned=s.cities.filter(c=>c.owner===id);
  owned.forEach(c=>{c.troops=0;c.units={};});owned[0]!.troops=100;
  expect(factionBonus(s,id).wages).toBe(3);
});
