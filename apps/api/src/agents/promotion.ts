export interface EvaluationReport {games:number;horizon:number;factions:number;winRate:number;unresolvedRate:number;meanCounties:number;bySeat:{seat:number;games:number;wins:number;unresolved:number}[]}
export function promotionDecision(candidate:EvaluationReport,incumbent:EvaluationReport):{promoted:boolean;reason:string}{
  const reject=(reason:string)=>({promoted:false,reason});
  if(candidate.games!==incumbent.games||candidate.horizon!==incumbent.horizon||candidate.factions!==incumbent.factions)return reject('incompatible-budgets');
  for(const r of [candidate,incumbent]){
    if(![r.winRate,r.unresolvedRate,r.meanCounties].every(Number.isFinite)||r.bySeat.length!==r.factions||new Set(r.bySeat.map(s=>s.seat)).size!==r.factions||r.bySeat.some(s=>s.games<1))return reject('incomplete-evidence');
  }
  if(candidate.winRate<incumbent.winRate)return reject('win-regression');
  for(const old of incumbent.bySeat){
    const next=candidate.bySeat.find(s=>s.seat===old.seat);
    if(!next||next.games!==old.games)return reject('incompatible-seats');
    if(next.wins/next.games<old.wins/old.games)return reject('faction-win-regression');
  }
  if(candidate.meanCounties<incumbent.meanCounties*.95)return reject('territorial-regression');
  if(candidate.winRate>incumbent.winRate)return {promoted:true,reason:'win-improvement'};
  if(candidate.unresolvedRate<=incumbent.unresolvedRate&&candidate.meanCounties>incumbent.meanCounties&&candidate.meanCounties>=incumbent.meanCounties*1.05)return {promoted:true,reason:'territorial-improvement'};
  return reject('no-demonstrated-improvement');
}
