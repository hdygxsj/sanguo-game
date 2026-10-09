export function evaluationSchedule(games:number,factions:number){
  if(!Number.isInteger(factions)||factions<2||factions>16)throw Error('INVALID_FACTION_COUNT');
  if(!Number.isInteger(games)||games<1)throw Error('INVALID_EVALUATION_BUDGET');
  if(games%factions!==0)throw Error('UNBALANCED_EVALUATION_BUDGET');
  return Array.from({length:games},(_,game)=>({seat:game%factions,seed:`evaluation-world-${Math.floor(game/factions)}`}));
}
