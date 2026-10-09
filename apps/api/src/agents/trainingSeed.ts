import {randomInt} from 'node:crypto';

// Record the returned seed so a diverse default run remains reproducible.
export function trainingSeed(seed?:number):number {
  if(seed===undefined)return randomInt(0x100000000);
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('INVALID_TRAINING_SEED');
  return seed;
}
