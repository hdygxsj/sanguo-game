import {afterEach,it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {TrainingChannel} from './trainingChannel.js';
const folders:string[]=[];
afterEach(()=>{for(const folder of folders.splice(0))rmSync(folder,{recursive:true,force:true});});
it('shares progress between independent clients and excludes a concurrent writer',()=>{
  const folder=mkdtempSync(join(tmpdir(),'arena-training-'));folders.push(folder);
  const writer=new TrainingChannel(folder),reader=new TrainingChannel(folder);
  const lease=writer.claim();
  lease.publish({status:'running',completed:3,total:10,reward:0,phase:'candidate-evaluation'});
  expect(reader.read()?.completed).toBe(3);
  expect(()=>reader.claim()).toThrow('TRAINING_BUSY');
  lease.publish({status:'completed',completed:10,total:10,reward:2});lease.release();
  expect(reader.read()?.status).toBe('completed');
  reader.claim().release();
});
it('detects a real exited worker and does not silently steal its stale lock',()=>{
  const folder=mkdtempSync(join(tmpdir(),'arena-training-'));folders.push(folder);
  execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`
    import {TrainingChannel} from ${JSON.stringify(new URL('./trainingChannel.ts',import.meta.url).href)};
    const lease=new TrainingChannel(${JSON.stringify(folder)}).claim();
    lease.publish({status:'running',completed:4,total:10,reward:0});
  `]);
  const reader=new TrainingChannel(folder);
  expect(reader.read()).toMatchObject({status:'failed',completed:4,error:'训练进程已退出，未完成评测'});
  expect(()=>reader.claim()).toThrow('TRAINING_LOCK_STALE');
});
it('rejects another OS process while a live writer owns the channel',()=>{
  const folder=mkdtempSync(join(tmpdir(),'arena-training-'));folders.push(folder);
  const lease=new TrainingChannel(folder).claim();
  const output=execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`
    import {TrainingChannel} from ${JSON.stringify(new URL('./trainingChannel.ts',import.meta.url).href)};
    try{new TrainingChannel(${JSON.stringify(folder)}).claim();console.log('unexpected');}
    catch(error){console.log(error.message);}
  `],{encoding:'utf8'});
  expect(output.trim()).toBe('TRAINING_BUSY');lease.release();
});
