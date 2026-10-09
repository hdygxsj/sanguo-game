import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {resolveTurn} from './resolveTurn.js';
import {refreshTalents} from './talentRefresh.js';
import {validatePersonnel} from './characters.js';
it('refreshes the offer pool once each turn, retaining recruited officers and their faces',()=>{
 const s=generateBattle('turn-pool',7,5,16);s.resources['agent-1']=1000;
 const old=s.characters!.filter(p=>p.origin==='generated');expect(old).toHaveLength(6);
 const selected=old[0]!;const order={type:'recruit-character' as const,characterId:selected.id};
 const next=resolveTurn(s,[{agentId:'agent-1',action:order}],s.version).state;
 expect(next.characters!.find(p=>p.id===selected.id)).toMatchObject({owner:'agent-1',portraitSeed:selected.portraitSeed});
 expect(next.characters!.filter(p=>p.origin==='generated'&&p.owner===null)).toHaveLength(6);
 expect(next.characters!.some(p=>p.id===old[1]!.id)).toBe(false);
 expect(validatePersonnel(next,'agent-1',{...order,characterId:old[1]!.id}).ok).toBe(false);
 const once=structuredClone(next);refreshTalents(next);expect(next).toEqual(once);
 expect(next.discoveredTalentIds).toHaveLength(8);
 const unavailable=next.characters!.find(p=>p.id.startsWith('historic-')&&!next.discoveredTalentIds!.includes(p.id))!;
 expect(validatePersonnel(next,'agent-1',{...order,characterId:unavailable.id}).ok).toBe(false);
});
it('does not discard officers referenced by family, prisoners or prior recruitment',()=>{
 const s=generateBattle('protected',7,5,16),people=s.characters!.filter(p=>p.origin==='generated');
 people[0]!.recruitedTurn=0;people[1]!.capturedBy='agent-1';
 s.unions=[{id:'u',personId:people[2]!.id,partnerId:'person-1-2',kind:'spouse',formedTurn:0}];
 s.turn++;refreshTalents(s);
 for(const p of people.slice(0,3))expect(s.characters!.some(c=>c.id===p.id)).toBe(true);
});
