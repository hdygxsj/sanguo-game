# Campaign Foundations Implementation Plan

**Goal:** Build the approved ruler-led Three Kingdoms strategic campaign, without controllable tactical battles.

**Architecture:** Preserve county identity, map rendering, immutable replay snapshots and versioned server turns. Put simulation rules in API domain modules. Training horizons are experiment budgets, never campaign victory conditions.

**Tech Stack:** TypeScript, Fastify, Prisma/SQLite, React, Three.js, Vitest.

## Full delivery scope (not yet complete)

- Historical factions and male/female character roster with original portraits.
- Unlimited campaign, meaningful economy, city construction, governors, offices and loyalty.
- Persistent armies, troop types, distance-based movement, encounters, siege, retreat and automatic battles.
- Diplomacy, alliances, trade, vassals, captives and recruitment.
- Adult relationships, spouses/concubines, children/aging, succession and marriage diplomacy.
- Character equipment, famous mounts and events.
- Map-first responsive controls with original art; preserve county graph and smooth zoom.
- Multi-round training with independent faction-level evaluation and archived results; no fabricated balance claims.

## Current execution batch: turn and economy foundations

- [x] Add failing resolver tests: passing a historical cap must not end a campaign; one survivor still wins; holding an unaffordable garrison charges upkeep and produces desertion without negative money.
- [x] Add `domain/economy.ts` containing shared recruit/development costs, revenue and upkeep calculations. Integrate those calculations into validation, settlement and both AI candidate generators.
- [x] Remove cap-based victory; retain `maxTurns=0` as wire/database compatibility sentinel for new games. Leave archived snapshots unchanged.
- [x] Bound training loops explicitly by an experiment horizon, report unresolved games separately from actual wins, remove cap-based learning features.
- [x] Update new-game request, turn indicators and training labels. New API battles normalize even legacy requested limits to zero.
- [x] Run API tests, web tests, both builds and diff checks before claiming this batch complete.

### Batch evidence — 2026-10-08

28 API tests, 29 frontend tests passed; both builds passed. Vite still warns about the existing large WebGL chunk. Trained 100 additional episodes (400 cumulative). Evaluation: 24 games, 60-turn budget, 0 genuine victories, all 24 unresolved. This disproves any claim of demonstrated faction balance and motivates persistent armies/longer-horizon evaluation. Prior policy and run results archived under `data/training-history`. Existing completed snapshots remain immutable and are not automatically reopened; existing active games adopt new settlement rules on their next turn. Historical factions, armies, characters, diplomacy and family systems remain unfinished.

## Verification commands

Use bundled Node on PATH. Run `pnpm --filter @agent-arena/api test`, `pnpm --filter @agent-arena/web test`, `pnpm --filter @agent-arena/api build`, `pnpm --filter @agent-arena/web build`.

## Next batches

Implement persistent strategic armies before deeper combat training. Add historical scenario data and characters, then diplomacy/family and integrated player command UI. Final balance acceptance requires actual independent victories for every major faction, uncertainty estimates and unresolved-rate reporting; a short-horizon territorial score is diagnostic only.
