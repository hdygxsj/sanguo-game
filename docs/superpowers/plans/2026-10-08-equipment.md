# Hero Equipment Implementation Plan

**Goal:** Usable weapons, governance treasures and mounts with real economic, combat and travel effects.

**Architecture:** Optional snapshot equipment inventory; catalog definitions are shared pure data. Each item instance has a stable ID, faction owner and optional bearer; each bearer has one item per slot. Existing character records and army coordinates remain unchanged. Legacy snapshots without equipment stay valid; buying initializes an inventory.

**Rules:** Buy/equip/unequip consumes one faction order. Purchases require a city and treasury. Common items can be bought repeatedly; named items are unique worldwide. Equipping returns the former same-slot item to faction inventory; cannot change gear during a march or captivity. Effective command/politics capped at 100; commander combat bonus remains at most 20%. Mount march bonus capped at 15%, applied continuously to the existing base speed and ETA. Capturing a commander transfers their equipped gear to captor inventory and removes bearer; deserters leave gear in faction inventory. Old battles without characters cannot buy. No selling, item duplication, tactical gear micromanagement or historical authenticity claims.

- [x] Add failing domain tests for prices, uniqueness, bearer ownership/slots, assignment locks, effective attributes, march speed and captive transfer.
- [x] Implement equipment module and snapshot/actions/schema; integrate combat, governance, movement and rule-assisted AI purchasing/equipping.
- [x] Add failing UI tests and personnel equipment component; show actual effective stats and availability.
- [x] Run full tests/builds, review, browser purchase/equip check and document remaining scope.

Verify API/web package `test` and `build`, `git diff --check`. This does not complete all requested equipment art, portraits, troop types or campaign balancing.

## Evidence — 2026-10-08

- 64 API tests and 44 frontend tests pass. Both production builds pass; existing large WebGL chunk warning remains. Whitespace check clean.
- Catalog: 10 definitions across weapon/mount/treasure; 3 common, 7 globally unique. Independent review found no important correctness issue in ownership, uniqueness, capture, effective attributes, movement or UI.
- Browser in retained agent-created test save: turn 2 treasury 96, purchased ring-pommel blade for 35, turn 3 treasury 76 after campaign income; equipped to Cao Cao, turn 4 effective command 85 versus base 80; inventory emptied and slot showed blade. Screenshot inspected, no browser warn/error logs.
- Mount test verifies both ETA (10→9) and actual normalized movement (.115 vs .1). Capture transfers the instance, removes bearer and cancels its previous commander's benefit. Swap/unequip preserves two original item instances.
- No new art assets or training run. Name-based equipment foundation is not a claim of finished high-quality 3D equipment, portraits, complete campaign simulation or balanced 16-faction win rates. Those remain active goal requirements.
