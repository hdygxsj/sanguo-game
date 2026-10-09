# Corrected siege features: controlled follow-up

## Long campaign diagnostic

Completed read-only `node scripts/campaign-diagnostic.mjs diagnostic-208 1200` with incumbent policy 542 and corrected siege features. No saves or weights changed. Compared with the previous diagnostic-208 run, gameplay, seed, horizon and policy weights are unchanged; the siege feature semantics differ.

| Metric at turn 1200 | Previous features | Corrected features |
| --- | ---: | ---: |
| Surviving factions | 14 | 10 |
| Largest realm (counties) | 236 | 349 |
| Attack orders | 5155 | 5235 |
| Recruit orders | 4018 | 4362 |
| Hold orders | 3500 | 1657 |
| Captures | 4987 | 5048 |
| Recaptures within 10 turns | 509 | 513 |
| Completed / winner | active / none | active / none |

Corrected run progress: largest realm 86 at turn 100, 194 at 500, 277 at 900, 307 at 1000, 326 at 1100, 349 at 1200. All final halted-troop counts are zero. The reduction in idle orders and increase in consolidation are encouraging for this seed, but a single paired campaign is not statistical evidence of balanced faction victories. Recapture churn remains, and no full-map victory occurred.

## Controlled training launched

Session 2997: 32 episodes, seed 208, training horizon 600, evaluation horizon 500, incumbent 542. This repeats the immediately preceding rejected run's budgets and seed with corrected siege features, not an unchanged retry. Existing candidate/incumbent paired evaluation and promotion guards remain. The process reports progress every 15 seconds when its event loop yields. Poll this exact handle while live; episode 32 is not final completion because evaluation follows. The final archived run and process exit establish completion. No promotion or outcome claimed at launch.

Diagnostic stdout exceeded the tool output limit inside verbose hold samples; the complete header and faction summary remained available. Conclusions above use only those retained sections, not missing hold samples.

## Terminal training result

Session 2997 exited 0, completed. Archive `data/training-history/run-1791459158582-208-574.json`: candidate mean counties 52.8125, incumbent 174.375; promotion false, territorial-regression. Candidate full-map wins 0/16, unresolved 16/16 at horizon 500. Local curriculum 11 resolved / 4 learner wins. Active policy remains 542 episodes. No active training from this run remains; do not restart or poll its completed handle.

This controlled result refutes siege-feature correction as a sufficient remedy for training deterioration. The separate incumbent all-faction diagnostic improved consolidation on its one seed, but training still severely degrades candidate behaviour. Next investigation should inspect learning-credit/update architecture rather than repeat another unchanged training run. This run used the old 16-game evaluation schedule loaded at process start, not the subsequently implemented paired-world-seat-v2 schedule.
