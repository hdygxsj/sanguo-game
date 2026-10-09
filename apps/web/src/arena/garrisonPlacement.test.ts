import {it,expect} from 'vitest';
import {garrisonSlots} from './garrisonPlacement';
const town={id:1,x:0,z:0,width:.1};
const field={height:(x:number,z:number)=>.02+x*.01+z*.01,contains:()=>true};
it('keeps all soldiers on dry ground outside neighbouring walls',()=>{
  const water=(_x:number,z:number)=>Math.abs(z-.05)<.035;
  const towns=[town,{id:2,x:.1,z:0,width:.12}];
  const slots=garrisonSlots(town,field,water,towns);
  expect(slots).toHaveLength(8);
  for(const p of slots){
    expect(water(p.x,p.z)).toBe(false);
    expect(p.y).toBe(field.height(p.x,p.z));
    expect(towns.every(t=>Math.max(Math.abs(p.x-t.x),Math.abs(p.z-t.z))>t.width*.64+.008)).toBe(true);
  }
});
it('omits decorative soldiers when there is no safe formation site',()=>{
  expect(garrisonSlots(town,field,()=>true,[town])).toEqual([]);
  expect(garrisonSlots(town,{...field,height:x=>x*4},()=>false,[town])).toEqual([]);
});
