# Reproducible training diversity

Goal: avoid repeating rejected candidates while preserving reproducibility and truthful results.

Evidence: `train` defaults to seed 190, RNG resets per invocation, and rejected runs keep previous episode count. Thus repeated equal-sized runs from the same checkpoint have identical simulation trajectories. Training history already records seed 190 rejected at candidate episode 526.

- [x] Test default seed freshness, explicit uint32 seeds including zero, and rejection of invalid seeds.
- [x] Use crypto-generated default seeds, expose the actual seed in TrainingStatus, retain seed in existing archive format. CLI accepts an optional seed and prints promotion/candidate results as well as the active policy.
- [x] Verify full test/build.
- [x] Complete actual seed-191 training (16 episodes), with same-seed 16-seat candidate/incumbent evaluations at 120 turns. Archive results; do not call horizon exhaustion victory or promote weaker candidates.

Files: `apps/api/src/agents/trainingSeed.ts` and test; `training.ts`, `trainCli.ts`. No changes to model promotion threshold or campaign victory rules. This is training data diversity, not proof of balanced win chances. Preserve all old checkpoints.

Evidence: new tests failed for fixed default and malformed seeds before the fix, then the full 117 API + 54 web tests passed. Production build and whitespace checks passed. Large WebGL bundle warning unchanged.

Actual run archive: `data/training-history/run-1791429652078-191-526.json`. Sixteen training episodes, rotating all 16 learner seats. Candidate mean counties 17.9375, matched incumbent 46.4375; both zero wins and 100% unresolved at 120 turns. Gate rejected with `territorial-regression`; active checkpoint remains 510 episodes. This run adds 16 actual experiments (558 cumulative including earlier rejected attempts), not 16 promoted episodes. Old policy's embedded evaluation is historical, not this fresh result.

Next evidence-driven work: investigate policy action distributions and long-campaign stagnation. New candidate shifted bias from +10.20 to -1.57 and development/recruitment weights down; this is a diagnostic observation, not proof of the cause. Do not keep rerunning the same configuration and claim balancing success.
