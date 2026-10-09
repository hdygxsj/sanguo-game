# Economic investment representation

Goal: expose profitable development to the learner after three 500-turn diagnostics produced zero construction orders.

Design: v3 appends two features to existing 19: marginal net income / 4, and 10-turn income-to-cost ratio, both clamped to [-1,1]. Calculate shared fiscal tax losses and upkeep, including building maintenance. Reuse one economic context per decision to avoid filtering the map for every candidate. State utility gives completed buildings 0.08 per net economic contribution, no credit for unfinished construction. Military barracks discounts are not represented as direct income. Preserve v1/v2 weights via zero-padding and preserve legacy loader support; no automatic checkpoint promotion.

- [x] Red tests for differing net yield/payback, completed-vs-queued construction value, and v2-compatible v3 upgrade.
- [x] Implement economic helpers, two features, utility contribution and loader version support.
- [x] Full tests/build, then new seeded training and matched evaluation. Report actual outcomes, including rejection.

Verification: four changed/new feature tests failed before implementation. Added fiscal-delta comparison across 1/16/17/40/80/500 counties and all three building types plus city expansion; verified no input mutation. Full 132 API + 55 web = 187 tests passed. Build and whitespace checks passed, existing WebGL chunk warning remains 1,041.08 kB. Local API restarted; HTTP 200 verified.

Actual 32-episode seed-193 run: `data/training-history/run-1791431170768-193-542.json`, candidate v3/21 weights. Learned economic weights 0.0715960414 and 0.0171407372 (started at zero), but matched mean counties 28.4375 vs incumbent 46.75; both zero wins and 100% unresolved at 120 turns. Rejected as territorial regression. Active checkpoint remains v2/510 episodes; total actual attempts across accepted/rejected histories now 622. No claim that construction behavior or overall balance is solved.

Limitations: per-building military utility (barracks discount), investment horizons beyond the current 8-step return, coordinated armies and all-faction wins remain incomplete. This increment exposes economic facts to learning, not a hard-coded instruction to buy buildings.
