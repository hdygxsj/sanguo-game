# Recruitment logistics

Evidence: deterministic all-learned 16-faction diagnostic `diagnostic-192`, 500 turns, active checkpoint 510. Cao Cao had 478 soldiers in a peace-enclosed county; Dong Zhuo 1708 in an isolated county adjacent only to peaceful/allied territory; Gongsun Zan 2620 similarly isolated. Several treasuries hit zero. Current recruitment candidates enumerate every owned county without route-to-front or sustainable wages.

Design: pure shared AI recruitment action generator. Multi-source BFS from hostile/neutral frontiers across owned counties. Recruit only at depth zero or one. Frontline target strength scales to local enemy garrison; nearby reserves capped at 40. Budget the added wages using shared fiscal estimate, governor salaries/revenue and trade income, maintaining 20 turns of projected deficit plus a 20 treasury reserve after purchase. This is an AI preference only, not a new player rule. Both rule and learned policies consume it. No change to peaceful transit rights, diplomatic behavior or victory rules.

- [x] Failing tests for frontier selection and both policy integrations, plus guards for sufficient garrison and projected insolvency.
- [x] Implement `agents/recruitment.ts`; integrate both policy entry points.
- [x] Full tests/build, rerun same-seed 500-turn diagnostic; report differences without fairness claims.

Verification: 121 API + 54 web tests passed, build and whitespace checks passed. No UI changes or new ML checkpoint in this batch. Existing large bundle warning remains.

Matched seed, checkpoint and 500-turn diagnostic after change: total attacks 1987 → 3137; recruitment orders 2933 → 1927; holds 927 → 768. Largest final county garrison across all factions was 29 (previously Gongsun Zan alone held 2620 in one county). All 16 factions still active, no unification winner. Liu Bei fell to 7 counties; the result is not evidence of faction fairness.

Newly clearer remaining problems: every treasury now accumulates (10,872–53,405 at turn 500); AI no longer burns money in trapped stacks, but economic sinks and peaceful-period investment remain insufficient. Several peaceful factions stop expanding. Follow-up must address diplomacy and spending incentives, not revert to wasteful recruitment merely to drain treasury. This one deterministic scenario is diagnostic evidence, not a statistical balance evaluation.
