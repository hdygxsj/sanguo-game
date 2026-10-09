# Incoming army defense

Goal: include already-dispatched hostile armies in campaign departure and occupation readiness. Existing flankGarrison only scans neighboring stationary defenders; road armies are separate state and were omitted.

Implementation: retain adjacent-garrison estimate, add active non-halted hostile armies whose final destination is the protected county. Calculate their effective attacking strength using destination weather, commander and unit counters divided by the county's defensive multiplier and counters. Preserve the maximum single-threat semantics; do not invent simultaneous stacking or treat friendly/peaceful forces as threats. Enemy origin excluded for a chosen attack must not exempt an army already committed to this destination.

Tests first: direct helper regression for a 60-spear inbound army at a 1.12-defense county; safe departure retains that reserve; pending enemy occupation attack suppresses a weak capture; peaceful and halted armies excluded. No change to road routes, combat math, turn limits or saved policy.

Run identical seed-201 500-turn read-only diagnostics before/after. Record both, without interpreting territorial growth as an actual victory. Run full tests and build. User authorizes autonomous implementation; no approval pause or branch mutation.

Implemented also in rear dispatch and frontier rally, which previously could drain a threatened source. Added six tests; four behavior regressions observed failing before their fix. Integer threshold uses a small epsilon to avoid floating-point division allowing an exact-tie garrison when a strict defense surplus is intended. All 21 campaign tests pass. Full suite passed 257 tests before adding the final peaceful-army test; subsequent campaign suite passes all 21. Production build passes (existing large frontend chunk warning).

Read-only seed 201, 500 turns, same incumbent learned policy:

| Metric | Before | After |
|---|---:|---:|
| Captures | 2820 | 2523 |
| Recaptures within 10 turns | 318 | 283 |
| Attacks | 2892 | 2625 |
| Moves | 765 | 928 |
| Holds | 679 | 1079 |
| Largest realm | 200 | 181 |
| Surviving factions | 14 | 15 |

Both unresolved; short recapture proportion is essentially unchanged (11.3% vs 11.2%). This proves the omission is fixed, NOT improved overall performance, balanced winners or successful training. The next strategic problem remains organizing sustained offensives rather than accumulating additional defensive constraints. No saved policy replaced and no player save advanced.
