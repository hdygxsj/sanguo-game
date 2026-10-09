# Ruler Control and Historical Factions

**Goal:** Move from an AI-only demonstration to an interactive ruler-led strategic campaign, with historical faction identities.

**Architecture:** Keep county and agent IDs stable. New historical games use a data-driven roster and starter commanderies; old saves remain untouched. A player's first valid order atomically binds the chosen faction in the next immutable turn snapshot. Subsequent requests cannot control another faction. Spectator games retain AI auto-play; a bound ruler without an order holds rather than being silently replaced by AI.

**Tech Stack:** Fastify/Zod, Prisma turn snapshots, React DOM drawer, existing Three.js map.

- [x] Test 16 distinct historical factions, starter territory and unique display colors.
- [x] Add original scenario configuration: historical names but deliberately approximate starting territories, not claimed exact for one year.
- [x] Test authenticated manual turn orders, invalid commands without advancement, faction binding, and replay persistence.
- [x] Add strict action payload validation and service-side ownership/version/domain validation before AI runs.
- [x] Add a map-first ruler drawer for faction selection, source county, recruitment, development and road movement. Keep ordinary map controls and replay; disable player orders in replay/busy/completed states.
- [x] Verify API/web tests, builds and browser UI; archive remaining work separately.

Roster reference: https://academy.totalwar.com/three-kingdoms-warlords/ and https://asia.sega.com/totalwar-three-kingdoms/en/ (checked 2026-10-08). These establish the reference game's warlord concept, not the accuracy of our starting borders. Our extended regional roster and starting group allocation are game-design choices; no commercial portraits, models or text copied.

## Verification and handoff, 2026-10-08

API: 38 tests passed. Frontend: 34 tests passed, including a workspace-to-API ruler-order integration test. Both production builds passed after correcting a Testing Library option type. Also updated the stale rules dialog which still claimed capped-turn territorial victory; a regression test now rejects that copy.

Browser 1280×720: created a separate local 16-faction campaign and selected Cao Cao. Recruited 6 troops (36→42), upgraded the capital (level 2→3), then dispatched 20 troops toward Nanzheng (capital 42→22). Reached turn 3 with 29 total marching armies; no console warnings/errors. Identity selector locks after the first successful command, automatic spectator advance is disabled for a player, and the map stays primary with the ruler drawer occupying the right edge. This test save is retained, not deleted. Existing user's tab and old saved battles were not altered. Current local API PTY: 27804.

Remaining full-goal work: male/female historical characters and original portraits; leader assignment, troop types, morale, siege/retreat, governors/offices/loyalty, diplomacy/captives, relationships/family/children/succession, equipment/mounts and richer construction. The current player economy/army interaction is functional but one order per faction per turn, not a full multi-army orders phase. Training still uses four-faction evaluation and a short horizon: must expand that before claiming 16-faction balance. Existing 500-episode checkpoint was not retrained this batch.
