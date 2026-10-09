import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {expandRoster} from './rosterExpansion.js';
it('expands named characters and generates six unique seeded offers without gifting staff',()=>{
 const s=generateBattle('expanded',7,5,16),people=s.characters!;
 expect(people.filter(p=>p.origin!=='generated').length).toBeGreaterThanOrEqual(200);
 expect(people.filter(p=>p.origin==='generated')).toHaveLength(6);
 expect(people.filter(p=>p.owner!==null)).toHaveLength(48);
 expect(new Set(people.map(p=>p.name)).size).toBe(people.length);
 expect(new Set(people.map(p=>p.id)).size).toBe(people.length);
 for(const name of ['夏侯惇','郭嘉','姜维','邓艾','钟会','鲁肃','吕蒙','贾诩','张春华','步练师'])expect(people.some(p=>p.name===name)).toBe(true);
 expect(generateBattle('expanded',7,5,16).characters).toEqual(people);
 const random=people.filter(p=>p.origin==='generated');
 expect(random).not.toEqual(generateBattle('other-seed',7,5,16).characters!.filter(p=>p.origin==='generated'));
 for(const p of random){expect(p.command).toBeGreaterThanOrEqual(50);expect(p.command).toBeLessThanOrEqual(88);expect(p.ageYears).toBeGreaterThanOrEqual(18);expect(p.portraitSeed).toBeDefined();}
});
it('upgrades only missing entries once without touching existing characters',()=>{
 const s=generateBattle('legacy',7,5,16);s.characters=s.characters!.filter(p=>p.id.startsWith('person-')||p.id.startsWith('talent-'));
 delete s.rosterVersion;
 s.characters[0]!.loyalty=37;s.characters[0]!.capturedBy='agent-2';
 const prior=structuredClone(s.characters);
 expandRoster(s);const once=structuredClone(s);expandRoster(s);
 expect(s).toEqual(once);expect(s.characters!.slice(0,prior.length)).toEqual(prior);
 expect(s.characters!.filter(p=>p.origin==='generated')).toHaveLength(6);
});
