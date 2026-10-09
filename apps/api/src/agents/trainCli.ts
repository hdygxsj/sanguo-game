import { train,training } from './training.js';
const episodes=Number(process.argv[2] ?? 300);
if(!Number.isInteger(episodes)||episodes<10||episodes>2000) throw new Error('Use 10–2000 training episodes');
const seed=process.argv[3]===undefined?undefined:Number(process.argv[3]);
const horizon=process.argv[4]===undefined?undefined:Number(process.argv[4]);
const evaluationHorizon=process.argv[5]===undefined?undefined:Number(process.argv[5]);
const evaluationGames=process.argv[6]===undefined?undefined:Number(process.argv[6]);
const timer=setInterval(()=>console.error(JSON.stringify({status:training.status,phase:training.phase,
  completed:training.completed,total:training.total,evaluation:training.evaluationProgress})),15000);
try{
  await train(episodes,seed,{horizon,evaluationHorizon,evaluationGames});
  console.log(JSON.stringify(training,null,2));
}finally{clearInterval(timer);}
