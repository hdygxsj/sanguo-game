import {it,expect} from 'vitest';
import {archerSlots,garrisonUnitSlots} from './garrisonComposition';
it('represents mounted troops as cavalry instead of generic spearmen',()=>{
  expect(garrisonUnitSlots(80,{cavalry:80},8)).toEqual(Array(8).fill('cavalry'));
  const mixed=garrisonUnitSlots(80,{spear:20,sword:20,archer:20,cavalry:20},8);
  for(const unit of ['spear','sword','archer','cavalry'])expect(mixed.filter(s=>s===unit)).toHaveLength(2);
});
it('allocates distinct sword and archer slots with a fixed total formation size',()=>{
  const slots=garrisonUnitSlots(80,{spear:20,sword:40,archer:20},8);
  expect(slots).toHaveLength(8);
  expect(slots.filter(s=>s==='sword')).toHaveLength(4);
  expect(slots.filter(s=>s==='archer')).toHaveLength(2);
  expect(slots.filter(s=>s==='spear')).toHaveLength(2);
  expect(garrisonUnitSlots(0,{},8)).toEqual([]);
  expect(garrisonUnitSlots(20,undefined,8)).toEqual(['spear','spear']);
});
it('distributes actual archer proportions without duplicating formation positions',()=>{
  expect(archerSlots(80,40,8)).toEqual([true,false,true,false,true,false,true,false]);
  expect(archerSlots(30,30,8)).toEqual([true,true,true]);
  expect(archerSlots(30,0,8)).toEqual([false,false,false]);
  expect(archerSlots(0,0,8)).toEqual([]);
  expect(archerSlots(80,80,2)).toEqual([true,true]);
});
