# Independent theatre rally

Goal: stop an available attack in one disconnected friendly component from disabling rallies everywhere. The global `if(!attacks.length)` currently couples unrelated theatres.

Design: retain real friendly connected components, incoming-force readiness and existing safety reserves. Always inspect components; skip rally only when a legal attack originates in that same component. No army teleportation, new orders per turn, save fields or learned-policy replacement. Global action ordering still prioritizes attacks; this change exposes the correct choices to the learner and preserves rule-policy priorities.

Test: build two disconnected friendly components. First has a 100-troop garrison facing a weak enemy and can attack. Second has two adjacent 20-troop fronts facing a 20-troop enemy and needs to rally. Assert both attack and second-theatre rally candidates exist, while the prepared first component does not rally. Observe failure before implementation. Run complete tests/build and seed-201 500-turn diagnostic; compare to incoming-defense baseline (2523 captures, 283 short recaptures, largest 181, 15 survivors, 1079 holds). Do not label territory as victory.

This follows systematic-debugging and TDD skills. User requested autonomous execution; preserve the dirty worktree without commits.

Implemented and observed the added regression fail first, then pass. Full tests/build passed (259 tests: 173 API + 86 web). Same-policy seed-201 500-turn simulation is exactly unchanged: 2523 captures, 283 short recaptures, largest 181, 15 survivors, 1079 holds. Exposing previously suppressed legal rally options is necessary but does not make this incumbent policy choose them. No claim of overall improvement. Start a 32-episode self-play run, seed 205, 240-turn learning horizon / 120-turn full-map evaluation. Preserve existing promotion gate and distinguish local curriculum wins from full-map victories.

Training exec session 50253 completed: archive `data/training-history/run-1791446145935-205-574.json`. Curriculum 11 resolved, five learner wins; full-map candidate mean 41.4375 counties versus incumbent 66, zero unification wins and 100% unresolved. Candidate rejected for territorial regression; active policy unchanged. Serving API session 82323 still has the previous incoming-defense runtime; current CLI and build include independent theatres.

After training finished, restarted the verified local API process with current build (session 62171). It now includes independent theatre planning; no saved policy changed. Health endpoint confirmed status ok.
