import type {TrainingStatus} from './training.js';
import {mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
type Record={pid:number;token:string;status:TrainingStatus};
function alive(pid:number){try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code!=='ESRCH';}}
export class TrainingChannel {
  constructor(private folder:string){}
  read():TrainingStatus|undefined{
    try{
      const record=JSON.parse(readFileSync(join(this.folder,'status.json'),'utf8')) as Record;
      if(record.status.status==='running'&&!alive(record.pid))return {...record.status,status:'failed',error:'训练进程已退出，未完成评测'};
      return record.status;
    }catch{return undefined;}
  }
  claim(){
    mkdirSync(this.folder,{recursive:true});
    const lock=join(this.folder,'writer.lock'),token=randomUUID();
    try{writeFileSync(lock,JSON.stringify({pid:process.pid,token}),{flag:'wx'});}
    catch(error){
      if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
      // Never delete a lock on a timeout: a slow evaluation is still live.
      let stale=false;
      try{stale=!alive(JSON.parse(readFileSync(lock,'utf8')).pid);}catch{}
      throw new Error(stale?'TRAINING_LOCK_STALE':'TRAINING_BUSY');
    }
    let released=false;
    const owns=()=>!released&&JSON.parse(readFileSync(lock,'utf8')).token===token;
    return {
      publish:(status:TrainingStatus)=>{
        if(!owns())throw new Error('TRAINING_LEASE_LOST');
        const temporary=join(this.folder,`${token}.tmp`);
        writeFileSync(temporary,JSON.stringify({pid:process.pid,token,status}));
        renameSync(temporary,join(this.folder,'status.json'));
      },
      release:()=>{if(released)return;if(owns())unlinkSync(lock);released=true;},
    };
  }
}
