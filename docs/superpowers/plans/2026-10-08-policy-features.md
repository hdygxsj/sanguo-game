# Composition-aware policy implementation plan

**Goal:** Let newly trained policies distinguish recruitment composition and its economic/mobility tradeoffs without changing saved v1 policy scores.

**Architecture:** Append seven bounded features to the existing twelve: four recruitment unit indicators, treasury cost share, upkeep burden, and recruited cavalry mobility. New policies use version 2. Version 1 scoring uses only its original twelve weights; training upgrades a copy by zero-padding, preserving originals and archiving checkpoints through the existing pipeline.

**Stack:** TypeScript, Vitest, existing linear Q-learning.

- [x] Write failing tests in `apps/api/src/agents/learning.test.ts`: equal-count recruitment differs; legacy score remains finite/exact; upgrades preserve weights without mutating input.
- [x] Run `pnpm --filter @agent-arena/api exec vitest run src/agents/learning.test.ts` and confirm intended failures.
- [x] Update `learning.ts` feature count, version, scoring and upgrade helper; update `training.ts` checkpoint validation and upgrade at training boundary.
- [x] Run targeted and full tests/build. Record remaining 16-faction evaluation and delayed-reward training work; do not claim balanced wins.

## Evidence

All three feature tests failed before implementation and passed afterwards. Added a fourth regression test for all 16 evaluation seats (failed with only four seats before implementation). Full suite: 75 API + 45 frontend tests passed. Build passed; existing large WebGL chunk warning remains.

Ran 10 additional self-play episodes, taking checkpoint from 500/v1 to 510/v2; original checkpoint archived by training pipeline. Seven appended feature weights became nonzero. This establishes training updates, not effective tactics.

Standard held-out evaluation: 24 games, 60-turn horizon, four factions, all unresolved, zero true wins; mean learner counties 36.9167. Extended evaluation: 16 games, 240-turn horizon, 16 factions, one learner game per seat plus paired baseline games. All unresolved for both learned and baseline policies; zero true wins; mean learner counties 110.3125. Budget exhaustion is never credited as victory. One game per faction cannot establish win probabilities.

Still required: strategic concentration and delayed march rewards, larger held-out seeds and genuinely resolved long campaigns, 16-faction training (training itself still uses four seats), financial/combat balance and uncertainty estimates. Do not treat this checkpoint as balanced or the overall game as complete.
