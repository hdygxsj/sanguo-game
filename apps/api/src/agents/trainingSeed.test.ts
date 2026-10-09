import {expect,it} from 'vitest';
import {trainingSeed} from './trainingSeed.js';
it('generates fresh uint32 training seeds instead of replaying the same rejected batch',()=>{
  const seeds=Array.from({length:32},()=>trainingSeed());
  expect(new Set(seeds).size).toBeGreaterThan(1);
  expect(seeds.every(s=>Number.isInteger(s)&&s>=0&&s<=0xffffffff)).toBe(true);
});
it('preserves explicit seeds including zero for reproducible runs',()=>{
  for(const seed of [0,190,191,0xffffffff])expect(trainingSeed(seed)).toBe(seed);
});
it('rejects malformed seeds instead of silently coercing them into identical RNG states',()=>{
  for(const seed of [-1,1.5,NaN,Infinity,0x100000000])expect(()=>trainingSeed(seed)).toThrow('INVALID_TRAINING_SEED');
});
