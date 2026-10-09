# Cross-seed campaign evidence

Current rules include construction, recruitment logistics, opportunistic post-truce diplomacy and administrative tax loss. All diagnostics use the active 510-episode checkpoint on every faction. These are campaign diagnostics, not independent trained-versus-baseline evaluations. The 500-turn observation horizon is not a game turn cap.

| Faction | diagnostic-192 counties | diagnostic-193 counties | diagnostic-194 counties |
|---|---:|---:|---:|
| 曹操 | 106 | 116 | 62 |
| 刘备 | 88 | 69 | 43 |
| 孙坚 | 36 | 40 | 61 |
| 袁绍 | 73 | 35 | 39 |
| 袁术 | 100 | 71 | 74 |
| 董卓 | 104 | 80 | 126 |
| 刘表 | 63 | 77 | 16 |
| 刘焉 | 84 | 73 | 109 |
| 马腾 | 57 | 92 | 31 |
| 公孙瓒 | 130 | 35 | 92 |
| 孔融 | 22 | 39 | 101 |
| 张燕 | 28 | 80 | 67 |
| 陶谦 | 55 | 72 | 71 |
| 刘繇 | 53 | 57 | 49 |
| 张鲁 | 67 | 106 | 93 |
| 士燮 | 70 | 70 | 114 |

All 16 factions survived in all three cases; all three were unresolved with no winner. This is not proof that all factions can win. Seed 193 treasury ranged 16–9534 and maximum county garrison 27. Seed 194 treasury ranged 16–7807 and maximum county garrison 22; 袁绍、刘焉、刘繇 had no hostile frontier at the end. So reduced trapped over-recruitment and stronger financial constraints persist beyond one seed, but political/military stalemates remain.

Both new 500-turn runs produced zero development orders. Inspection confirms the current 19-feature policy has no explicit building income/return-on-investment feature, and state utility does not directly value completed buildings. This does not prove a single cause, but identifies a representation gap worth addressing before more identical training runs. Do not replace that investigation with unconditional construction spending.

Reproduction: `pnpm build`, then `node scripts/campaign-diagnostic.mjs diagnostic-193 500` and `node scripts/campaign-diagnostic.mjs diagnostic-194 500`. These commands do not write saves or policies. Training seed 192, 32 episodes was started separately; its archive and matched evaluation will determine promotion, not these diagnostic territory rankings.

Training completed: `data/training-history/run-1791430812358-192-542.json`. The 32-episode candidate scored 34.25 mean counties against incumbent 46.75 under identical 16-seat, 120-turn evaluation budgets. Both had zero wins and 100% unresolved games. Promotion rejected (`territorial-regression`); active policy remains 510 episodes. Cumulative actual training attempts now 590 including rejected runs; this is not 590 episodes in the active checkpoint. No simulation code changed in this evidence-gathering batch.

Next action from evidence: add economic-return representation and test profitable construction learning, then rerun matched evaluation. Repeating unchanged training alone is not producing a better policy.
