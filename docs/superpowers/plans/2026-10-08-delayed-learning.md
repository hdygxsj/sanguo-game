# Delayed campaign reward plan

**Goal:** Credit strategic actions with delayed campaign rewards and train across all historical faction seats.

**Design:** An eight-step return buffer per learner episode; discount .92 and existing bounded linear update. Each transition stores only its feature vector and scalar reward. On a full buffer, update the oldest action against the discounted rewards and current bootstrap value. Flush residual transitions at episode end; genuine terminal states bootstrap zero while a training horizon bootstraps the current state. This is approximate off-policy n-step Q learning, not proof of optimality. It does not alter gameplay rules or add a turn cap.

- [x] Add failing pure-update tests proving delayed rewards and bootstrap discounting. Add terminal/horizon flush integration checks.
- [x] Implement isolated return-buffer helpers, preserving one-step update compatibility.
- [x] Integrate episode-local buffers, rotate all 16 learner seats using cumulative episode index, use 120-turn training budget and 16-seat evaluation.
- [x] Run tests/build and a 16-episode training batch; record genuine outcomes without claiming balance from unresolved games.

## Results and rejected checkpoint

124 tests passed (79 API / 45 web); build passed with existing WebGL chunk warning; whitespace check passed. The two pure-return assertions failed against the stub then passed after implementation. Terminal and horizon integration checks also pass.

16 additional training episodes produced candidate 526, archived in `data/training-history/run-1791426877385-190-526.json`. On matched 16-seat / 120-turn evaluation, candidate mean counties was 17.0625 versus previous checkpoint 510 at 64.5625. Both had zero genuine wins and all games unresolved. This is evidence of a territorial-performance regression, not of improved balance. Restored checkpoint 510 as the active model using its archived original; rejected candidate retained for analysis. Cumulative experiments total 526, active checkpoint episodes 510.

Next required work: automatic candidate promotion gates, exploration/off-policy stability and longer-horizon reward attribution, strategic gathering and opponent targeting, then repeated resolved-game evaluations. Eight-step reward support alone does not establish good gameplay AI. All remaining art/family/gameplay scope stays open.
