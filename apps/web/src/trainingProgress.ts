export interface ProgressStatus {
  completed:number;total:number;phase?:string;
  evaluationProgress?:{completed:number;total:number;seat:number;trained:boolean;turn:number;horizon:number};
}
export function trainingProgress(status:ProgressStatus){
  if(status.phase==='candidate-evaluation'||status.phase==='incumbent-evaluation'){
    const name=status.phase==='candidate-evaluation'?'候选策略评估':'旧策略评估',p=status.evaluationProgress;
    return {label:`${name}进度`,text:p?`${name} · ${p.completed} / ${p.total} 对局 · 席位 ${p.seat+1} · ${p.trained?'学习策略':'规则对照'} · ${p.turn} / ${p.horizon} 回合`:name,
      value:p?.completed,max:p?.total??1};
  }
  if(status.phase==='saving')return {label:'保存进度',text:'评估结束 · 正在保存结果与检查点',value:undefined,max:1};
  if(status.completed===status.total)return {label:'独立评测进度',text:'训练轮次已完成 · 正在独立评测',value:undefined,max:1};
  return {label:'训练进度',text:`训练中 · ${status.completed} / ${status.total} 局`,value:status.completed,max:status.total};
}
