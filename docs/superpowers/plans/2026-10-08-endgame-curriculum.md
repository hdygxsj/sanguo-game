# Endgame curriculum for training

Problem: all prior full-map short-budget evaluations remain unresolved; extending seed 201 to 2500 turns still yielded no winner. Repeated short opening-only training supplies almost no terminal feedback.

Training-only solution: every third episode is a connected 18-county theatre cut from the historical county graph near the learner's starting region. Remap local indices and adjacency, retain two active historical factions, assign nearest-root ownership, and stage 60 vs 24 capital troops plus four per ordinary county. Geography side and force advantage alternate; epoch parity also rotates the same faction between sides. Clear references incompatible with the cropped region. No campaign creation changes, no full-map territory loss in player saves.

Independent evaluation remains full-map with all 16 factions and unchanged actual-unification win criteria/promotion gates. Curriculum terminal results are separately tracked and archived, never added to full-map wins.

Tests: missing scenario helper and then geography-side rotation regressions observed failing first. Full suite 248 tests and build passed before the final epoch-rotation argument; subsequently API build and all seven curriculum/training tests passed. All 16 seats generated connected valid scenarios in a read-only diagnostic. Current policy completed all 16 within 5–16 turns, eight learner wins and eight losses. These are engineered training outcomes, not evidence that full-map factions can win.

Start 48 episodes with seed 204, horizon 240, full-map evaluation horizon 120. Preserve incumbent unless existing full-map promotion criteria pass. Larger map and all requested art/gameplay work remain in scope.

Run completed successfully; archive `data/training-history/run-1791444427418-204-590.json`. All 16 curriculum episodes resolved, eight learner wins. Full-map evaluation: candidate mean 58.25 counties versus incumbent 66.25; both zero unification wins and 100% unresolved. Candidate rejected for territorial regression; deployed policy remains version 3 / 542 episodes. This is not evidence of balanced full-map victory chances. Serving API session 19264 has not been restarted for this training-only change; CLI used the latest built training code.
