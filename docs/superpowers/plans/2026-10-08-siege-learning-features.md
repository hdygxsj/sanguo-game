# Siege learning feature correction

## Evidence and change

Following rejected training runs 206–208, inspection found a reproducible mismatch: attack advantage features used troop count, weather and fortification, but omitted the unit counters, cavalry siege penalty and commander multiplier used by actual combat resolution.

Attack features 7 and 8 now derive the attacking composition with `detachTroops` on a copy, then use the shared combat multipliers. Source troops are not mutated. This is an inference correction, not a new weight checkpoint; the incumbent policy also receives corrected features. Prior evaluation results therefore cannot be treated as a current baseline.

## Regression evidence

- The new sword/cavalry/commander comparison failed before the implementation and passed after it.
- All 80 combinations of four attacking unit types, four defending unit types and five weather conditions compare the learned win feature with actual siege resolution.
- Input-state immutability is asserted.
- Complete regression: 186 API tests and 143 web tests passed (329 total); typecheck and production build passed. Existing large web bundle warning remains. Local API restarted with the correction and `/api/health` returned `ok`; no user saves were reset.

## Limits and next evaluation

The mismatch is established; it is not established as the sole cause of candidate regression or the persistent full-map stalemate. No checkpoint is promoted on this correction alone. Re-evaluate the incumbent and candidate using identical seeds and the corrected feature semantics before judging training improvement. Curriculum wins remain distinct from full-map victories; no claim of balanced faction win rates is warranted yet.
