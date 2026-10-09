import type {LearnedPolicy} from '../domain/types.js';
export interface Transition {
  features:number[];reward:number;
  // Value of the target-policy action at this state, captured before learning,
  // when behaviour selected a lower-valued exploratory action instead.
  bootstrapBefore?:number;
}
// Candidate-training settings only; serving an existing policy does not use
// these values. Longer marches need credit beyond the old eight-turn window.
export const RETURN_DISCOUNT=.98;
export const RETURN_STEPS=24;
export function updateReturn(policy:LearnedPolicy,steps:Transition[],bootstrap:number) {
  const first=steps[0];if(!first)return;
  let target=bootstrap;
  for(let i=steps.length-1;i>=0;i--){
    const step=steps[i]!;
    // A greedy-target tree backup must not sample rewards beyond a deviation.
    // The first action is conditioned on, so its own outcome is still learned.
    target=i>0&&step.bootstrapBefore!==undefined?step.bootstrapBefore:step.reward+RETURN_DISCOUNT*target;
  }
  const f=first.features;
  const predicted=f.reduce((sum,v,i)=>sum+v*(policy.weights[i]??0),0);
  const error=Math.max(-5,Math.min(5,target-predicted));
  const norm=1+f.reduce((sum,v)=>sum+v*v,0);
  policy.weights=policy.weights.map((w,i)=>Math.max(-30,Math.min(30,w+.035*error*(f[i]??0)/norm)));
}
