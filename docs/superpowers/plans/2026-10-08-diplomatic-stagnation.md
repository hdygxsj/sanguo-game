# Diplomatic stagnation

Evidence: 500-turn diagnostic after recruitment repair still left multiple factions with no hostile frontier. Existing AI only redeclares from peace when total strength exceeds 1.6x the neighbor; near-peer peaceful neighbors can consequently remain inactive indefinitely.

Design: retain all treaty rules and never auto-expire peace into war. At the existing staggered diplomatic decision interval, AI may reopen an expired peace after an additional 12-turn grace period if it has no hostile/neutral frontier, at least 40 treasury, at least 90% of the target's total strength, and one shared border with at least 35% attacking power advantage after reserving 15% garrison and accounting for weather and troop counters. Preserve alliances and player-controlled faction autonomy. Existing normal peace/trade policies remain. Player-target declarations are ordinary legal war actions, not forced agreement to an offer.

- [x] Regression for a near-peer, peaceful enclosed AI opening a viable border, plus truce/alliance/weak-local-force/player guards.
- [x] Implement and validate legal proposal through existing diplomacy validator.
- [x] Full regression/build and same-seed long-run diagnosis. No victory claim without actual completion.

Verification: missing near-peer declaration failed first, then four new tests and existing diplomacy tests passed. Full suite 125 API + 54 web = 179 passed. Build and whitespace check passed. Added read-only `scripts/campaign-diagnostic.mjs`; it never writes game saves or checkpoints, accepts seed and turn budget and reports active vs completed honestly.

Run `node scripts/campaign-diagnostic.mjs diagnostic-192 500` after `pnpm build`: active checkpoint 510, 500 turns, all 16 factions still active, no winner. 15 war declarations; 3688 attack orders vs 3137 in the preceding recruitment-only version; Sun Jian 127 counties vs 63. Ma Teng and Shi Xie remain without hostile frontiers. Largest final garrison 32. Treasury 7510–56195, still too high. One deterministic trajectory is not statistical evidence of fair win rates.

Remaining: alliances deliberately stay protected by this AI preference; army concentration and economy still need work. There is no new ML training or promoted checkpoint in this increment.
