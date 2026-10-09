import {expect,it} from 'vitest';
import {generateBattle} from './generate.js';
import {settleFamily,related} from './lifecycle.js';
import {validatePersonnel,settleCharacters} from './characters.js';
import {availableCommanders} from './commanders.js';
import {validateEquipment} from './equipment.js';
function scenario(){const s=generateBattle('birth',7,5,2,0);s.turn=4;s.unions=[{id:'u',personId:'person-1-0',partnerId:'person-1-2',kind:'spouse',formedTurn:1,pregnancyDueTurn:4}];return s;}
it('creates one persistent child with both parents and does not settle twice',()=>{const s=scenario(),initialCount=s.characters!.length;settleFamily(s,()=>{});expect(s.characters).toHaveLength(initialCount+1);const child=s.characters![initialCount]!;expect(child.parentIds).toEqual(['person-1-0','person-1-2']);expect(child.ageYears).toBe(0);settleFamily(s,()=>{});expect(s.characters).toHaveLength(initialCount+1);expect(s.characters![0]!.ageYears).toBe(31);s.turn=8;settleFamily(s,()=>{});expect(child.ageYears).toBe(1);});
it('excludes children from offices, command, equipment and loyalty decay',()=>{const s=scenario(),p=s.characters![1]!;p.ageYears=2;const city=s.cities.find(c=>c.owner==='agent-1')!;expect(validatePersonnel(s,'agent-1',{type:'appoint-governor',characterId:p.id,cityId:city.id}).ok).toBe(false);expect(availableCommanders(s,'agent-1').some(c=>c.id===p.id)).toBe(false);s.equipment=[{id:'i',owner:'agent-1',templateId:'iron-sword'}];expect(validateEquipment(s,'agent-1',{type:'equip-equipment',characterId:p.id,itemId:'i'}).ok).toBe(false);settleCharacters(s,'agent-1',false,()=>{});expect(p.loyalty).toBe(75);});
it('detects grandparents and common ancestors without infinite loops',()=>{const s=scenario();s.characters![0]!.parentIds=['grand'];s.characters![2]!.parentIds=[s.characters![0]!.id];expect(related(s,s.characters![0]!,s.characters![2]!)).toBe(true);s.characters![1]!.parentIds=['grand'];expect(related(s,s.characters![1]!,s.characters![2]!)).toBe(true);s.characters![0]!.parentIds=[s.characters![2]!.id];expect(related(s,s.characters![0]!,s.characters![2]!)).toBe(true);});
it('conceives reproducibly, charges once and respects captivity and treasury',()=>{
  const base=scenario();delete base.unions![0]!.pregnancyDueTurn;
  let found=false;
  for(let i=0;i<40;i++){
    const s=structuredClone(base);s.seed=`fertility-${i}`;const copy=structuredClone(s),money=s.resources['agent-1']!;
    settleFamily(s,()=>{});settleFamily(copy,()=>{});expect(copy).toEqual(s);
    if(s.unions![0]!.pregnancyDueTurn){found=true;expect(s.resources['agent-1']).toBe(money-20);settleFamily(s,()=>{});expect(s.resources['agent-1']).toBe(money-20);
      const captive=structuredClone(base);captive.seed=s.seed;captive.characters![2]!.capturedBy='agent-2';settleFamily(captive,()=>{});expect(captive.unions![0]!.pregnancyDueTurn).toBeUndefined();
      const poor=structuredClone(base);poor.seed=s.seed;poor.resources['agent-1']=19;settleFamily(poor,()=>{});expect(poor.unions![0]!.pregnancyDueTurn).toBeUndefined();break;
    }
  }expect(found).toBe(true);
});
