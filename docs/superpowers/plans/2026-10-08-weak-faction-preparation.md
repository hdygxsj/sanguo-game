# Weak enclosed faction preparation

## Evidence

Read-only full-map diagnostic, active 542-episode policy, seed `diagnostic-207`, 500 turns. Before change: Yuan Shao held 9 counties, 67 garrison troops and 21624 treasury, no active frontier. Preparation required 90% of its neighbouring faction's strength before offering recruitment. This circular prerequisite prevented a wealthy minor faction from rebuilding strength.

## Change

Remove strength parity only from preparationTarget. Retain treaty reassessment periods, no-player automation, existing-front priority, recruitment costs and 20-turn deficit runway. Actual war declaration still checks strength and a viable assault. No checkpoint weights or victory conditions changed.

Regression test first failed on missing recruitment, then passed after the fix. It also asserts no attack or immediate war for the weak faction.

## Verification

Full suite: 176 API + 125 web = 301 passing. API build passed.

Same seed and 500-turn horizon after change: holds 1824 → 824; attacks 2308 → 2805; captures 2247 → 2707; quick recaptures 208 → 259. Yuan Shao remains at 9 counties but has 318 troops and 40 treasury. Two factions have no counties; this alone is not proof of elimination because marching armies can survive.

Both runs remain active at 500 turns: no unification winner. These are one-seed diagnostic results, not a balanced win-rate evaluation or ML training results. Need multi-seed paired evaluation and further actual training. Existing server process must be reloaded before this source change affects live games; diagnostic uses rebuilt dist directly.
