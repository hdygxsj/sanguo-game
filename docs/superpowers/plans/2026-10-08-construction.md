# County construction implementation plan

Balance update 2026-10-08: current farm maintenance is 1 per level and market maintenance is 2 per level. The initial design below records the earlier rates; see `2026-10-08-economic-planning.md` for the measured adjustment.

Goal: add meaningful, timed county investment without replacing the campaign or old saves.

Architecture: optional buildings and one construction job on CityState. Extend `develop` with optional `building`; absent means the existing city upgrade. Shared construction helpers feed validation, resolution, economy, recruitment pricing and the existing order drawer. No new permanent map overlay. TypeScript, React, Fastify, Vitest.

Design decisions: farm/market/barracks, maximum three levels each. Distinct building slots equal min(3, city level); upgrades do not consume another slot. Costs per next level are 30/40/50 respectively. Queue starts at submitted turn and completes two settlements later (order at turn 0 finishes at turn 2). Prepay; buildings and jobs remain with the county on conquest. One job at a time; city upgrades blocked while building. Farm revenue per level 2, or 4 on farmland/granary. Market revenue 4 and maintenance 1 per level. Barracks maintenance 1 per level and recruitment discount 10% per level rounded up per soldier. No independent food system claimed.

- [x] Domain failing tests: delayed completion, slot/cap/busy/funds/ownership validation, economic yields and barracks prices.
- [x] Implement construction helpers, mirrored types, schema, resolve and fiscal integration.
- [x] UI failing test then contextual building chooser, prices, job status and shared validation in existing drawer; preserve map-first presentation.
- [x] Include legal buildings in AI choices without claiming learned building preferences; test candidates.
- [x] Full test/build and record evidence. No branch commit or merge requested.

Main files: `apps/api/src/domain/construction.ts`, `construction.test.ts`, `types.ts`, `rules.ts`, `resolveTurn.ts`, `economy.ts`, `apps/api/src/server.ts`, `agents/strategies.ts`, `agents/learning.ts`, `apps/web/src/types.ts`, `RulerCommands.tsx` and its tests. Run `pnpm --filter @agent-arena/api exec vitest run src/domain/construction.test.ts`, then `pnpm test && pnpm build`.

Verification: four domain tests, two UI tests and one policy candidate test failed on missing behavior before implementation. Added exact recruitment debit, conquered-job idempotence and API/replay persistence coverage. Full suite: 114 API + 54 web = 168 passed. Build and whitespace checks passed; existing large battle bundle warning remains (1,039.61 kB).

Browser QA: agent-created family test save advanced from turn 20 to 22. Built a market in 濮陽縣 for 40: turn 21 showed one turn remaining, blocked duplicate construction and retained city level 2; turn 22 showed market level 1, slots 1/2, next upgrade cost 80 and treasury 271. Screenshot inspected at 1280×720: contextual right drawer, central map clear, readable construction status. No warning/error console logs. Temporary tab closed; user tab untouched. Local API restarted with new build.

Limits: buildings currently affect simulation and contextual UI, not individual 3D building models. No food stockpile, demolition or cancellation yet. AI can select legal buildings and receives cost features, but no new policy training or balance victory claim in this increment. Underlying map remains visibly schematic; overall art and complete campaign scope are still unfinished.
