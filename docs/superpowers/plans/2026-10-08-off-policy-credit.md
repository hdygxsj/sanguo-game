# Correcting multi-step exploratory credit

## Reproduction

The existing 24-step learner summed every sampled reward then bootstrapped the target-policy value, while behaviour used epsilon exploration up to 0.4. No off-policy correction existed. A deterministic test with an earlier reward 1, later non-target action (target value 4), and subsequent losses -100 produced a negative update -0.0875 for the earlier decision. The target-policy return at that boundary is instead 1 + 0.98 × 4, yielding +0.0861 under the existing normalized update.

## Change

Each transition records the before-state target value if its sampled action has lower value than the target-policy action. Backward return calculation substitutes this value at subsequent deviations, excluding their rewards from earlier target-policy credit. The first action in each return remains conditioned on: its own exploratory result is still learned. Greedy trajectories retain the 24-step horizon, terminal and budget handling remain unchanged. Shared linear features, clipping, learning rate, discount, rewards, opponent selection and live gameplay are unchanged.

This is a greedy-target tree-backup-style correction, not a claim of a generally convergent linear off-policy algorithm. Background: Mahmood, Yu and Sutton, [Multi-step Off-policy Learning Without Importance Sampling Ratios](https://arxiv.org/abs/1702.03006), describes action-dependent bootstrapping and distinguishes stable function-approximation methods. We have not implemented that paper's two-timescale gradient algorithm and do not inherit its stability guarantee.

## Verification and limits

Observed regression tests fail before implementation (wrong sign and missing boundary metadata), then pass. Immediate exploratory reward remains learnable; existing delayed-reward, terminal flush and horizon tests remain green. All 191 API tests and API build passed. This proves the correction's target calculation, not improved campaign performance. Prior repeated degradation may also involve representation aliasing or nonstationary strategic context; avoid claiming this alone solves it.

Next experiment: same 32 training episodes, seed 208, training horizon 600; new paired-world-seat-v2 evaluation 48 games at horizon 500 for both candidate and incumbent. Evaluation differs from earlier 16-game runs, so compare only the fresh paired results. Incumbent remains 542 episodes until the promotion guard passes. No saves are reset.

Launched process session 14255. Poll this exact live handle; do not duplicate. Progress reaches 32 before evaluation is finished. Only terminal output and the new archived run establish completion. Live API process has not been restarted in this turn; candidate-training changes are loaded by this independent process, while serving the incumbent does not call `learn`.
