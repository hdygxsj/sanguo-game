# Campaign logistics

Goal: all rule personalities can prosecute wars, avoiding futile small attacks and moving rear troops monotonically toward a frontier.

Use shared battle multipliers to estimate siege power, a 15% safety margin, leave defensive reserves, and skip targets already receiving friendly troops. Multi-source breadth-first distances over friendly roads guide adjacent reinforcement moves; no teleporting or crossing peaceful borders. Expansion rules use these actions first; other rule personalities get a campaign opportunity every third turn. Learned policies receive the same periodic rule assistance (explicitly hybrid, not claimed learned).

- [x] Tests: rear movement and economic offensive action failed before implementation; restraint and inbound suppression assertions passed after implementation.
- [x] Implement pure campaign action generator and connect both policy paths.
- [x] Full tests/build; retain genuine-war balance work as unfinished.

## Evidence

Added an end-to-end deterministic simulation of rear gathering, real movement over multiple turns, attack and victory against a stationary defended city. Five campaign tests pass; full suite 89 API + 45 web = 134 passed. Build and whitespace checks passed (existing WebGL bundle size warning).

16-faction, 16-game, 120-turn held-out evaluation with active checkpoint 510: zero true wins, all unresolved, mean learner counties 49. Both learned hybrid and rule opponents now use logistics, so comparison to the previous 64.5625 county average does not isolate learner improvement. No model retraining or promotion in this batch. This demonstrates scenario-level logistics, not global balance or all-faction winning opportunities.

Remaining limitations: distance-to-front uses road hop count rather than travel time; periodic assistance only; frontier-to-frontier transfers and army redirect/retreat absent; learned choices between assisted turns can still be poor. Need stronger longer campaigns and all requested family/art/gameplay features.
