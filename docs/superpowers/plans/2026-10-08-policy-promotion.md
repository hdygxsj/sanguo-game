# Candidate promotion plan

**Goal:** Training must not automatically overwrite the active policy with an unvalidated candidate.

**Design:** Evaluate incumbent and candidate with identical 16-seat, 120-turn budgets and fixed seeds. A pure gate rejects incompatible budgets, missing seat coverage, lower overall or per-seat win rates, and territory regression exceeding 5%. Promotion requires a strict win-rate improvement or at least 5% territorial improvement without more unresolved games. Territorial progress is not a victory/fairness claim. Archive both evaluations, candidate and decision; write the active checkpoint only on acceptance. Training status exposes the decision and keeps active policy separate from candidate results.

- [x] Failing tests for regression, incompatible budgets, seat regression, unchanged candidates and accepted territorial improvement.
- [x] Implement pure gate and checkpoint integration.
- [x] Full tests/build and a real training run; verify rejected run leaves active bytes unchanged.

## Verification

Five new gate tests failed against the stub, then passed. Full suite 84 API + 45 web = 129 passed. Build passed with existing large-chunk warning. `git diff --check` passed.

Re-ran the reproducible 16-episode candidate specifically to exercise the new persistence gate. Archived run `run-1791427077612-190-526.json` includes candidate and incumbent evaluations and rejection decision. Active checkpoint remained 510; SHA-256 before and after was identical: `c87615c78dedde752079932653da515196ac74853bc24825341ed67bae1c7cb8`. No extra victory evidence was produced. The repeated run is regression verification, not independent evidence of training quality.

This is a conservative engineering regression gate, not statistical proof of balance. Broader seed sets, genuine resolved games and per-faction win opportunity remain required.
