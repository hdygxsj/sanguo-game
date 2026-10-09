# Longer march-credit experiment

Run 206 rejected despite longer simulation horizons. Code inspection disproved the suspected time-limit terminal bug: learn(flush=true) retains its bootstrap for a live faction. Do not claim a fix to truncation semantics.

Current eight-step / gamma .92 return heavily discounts delayed expansion (.92^20 ≈ .189). Experiment with a 24-step window and gamma .98, retaining existing clipped/normalized learning rate, features, game rules and incumbent checkpoint. This changes candidate learning only, not inference with the active policy. A twenty-step conquest-credit test failed at .00718 weight increment before adjustment; target is > .02. Tests also cover window length, terminal no-bootstrap, truncation flush and discounted bootstrap. Algorithm metadata records both window and discount. This is an experiment, not demonstrated AI improvement; candidate must pass the existing full-map promotion gate.

Next paired run should use the same seed 206 / 32 episodes / 600 training turns / 500 evaluation turns as the rejected run, isolating the return-setting change. Preserve the incumbent unless promotion passes. No tactical combat controls are introduced.

Full suite passed 279 tests (175 API, 104 web); API TypeScript build passed. Same-seed candidate run started after these checks. Existing running API is not restarted: serving decisions/checkpoint are unchanged, while the CLI loads the new candidate-training code. Do not treat the new run as successful before its archived paired evaluation is inspected.

Exec session 21751 completed, exit 0. Archive `data/training-history/run-1791453267774-206-574.json`: 24-step gamma .98 candidate mean 143.8125 counties versus incumbent 157.75, zero unified wins and 100% unresolved at 500 turns. Candidate rejected for territorial-regression; active policy unchanged. Same-seed prior eight-step .92 candidate was 58.6875, so this single experiment improves on the rejected candidate but still does not beat the incumbent or demonstrate victory balance. Curriculum again 11 resolved / four learner wins in small engineered scenarios. Session terminal; no training currently running.
