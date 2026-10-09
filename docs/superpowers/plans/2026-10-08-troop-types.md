# Troop Composition Implementation Plan

**Goal:** Persistent spear, sword, archer and cavalry composition affecting cost, upkeep, movement and automatic combat, without tactical controls.

**Architecture:** Optional `units` count records on cities and armies; `troops` remains the total for existing saves/renderers. Legacy absent compositions mean spear infantry. Shared pure helpers split proportionally with largest-remainder integer allocation, merge, and apply proportional casualties. All runtime troop mutations route through helpers. Existing snapshots stay immutable.

**Rules:** Recruitment costs 3/4/4/7; upkeep .15/.2/.2/.4 per spear/sword/archer/cavalry. Counter multipliers: spears beat cavalry, swords beat spears, archers beat swords, cavalry beat archers; mixed armies use weighted proportions. Cavalry has an assault penalty, archers a small assault bonus. Mounted share increases march speed up to 35%; equipment mounts remain separate capped bonus. Orders dispatch a proportional composition, leaving at least one soldier. No instant conversions or free new troops. AI can recruit all types under the same validator.

- [x] Failing tests: integer conservation, legacy composition, cost/maintenance, counter outcomes, movement and siege/merge/desertion preservation.
- [x] Implement module and integrate recruitment, fiscal settlement, marching/collision/siege/arrivals; update types/schema and AI.
- [x] Add UI test and recruit-type selector/cost explanation; display garrison and army composition.
- [x] Run all tests/builds, independent review and browser recruiting check. Record missing regiment management, supply/retreat, art and balance work separately.

## Verification — 2026-10-08

- Full `pnpm test`: 71 API and 45 frontend tests passed (116 total).
- `pnpm build` passed; existing large WebGL bundle warning remains (1,029.52 kB uncompressed).
- `git diff --check` passed.
- Independent review found no important correctness issues; 61,440 small-composition splits checked for conservation.
- Browser test on the agent-created save: turn 4, treasury 91, Ye garrison 1 spear; selected 3 cavalry, displayed cost 21; submitted and reached turn 5 with 1 spear + 3 cavalry. Treasury 89 after normal turn income/expenses and other concurrent events. Screenshot inspected; no browser warning/error logs recorded. Original user tab/saves were not operated.

## Remaining scope / limitations

- Learned policy's current features do not distinguish recruit unit types; equal-sized candidates tie. Candidate support is not evidence of learned composition tactics. No new training or faction-win balance claim in this batch.
- Regiment management, supply, retreat/redirect orders, richer troop art, family/succession and broader requested systems remain unfinished.
- Four archetypes and illustrative counter values need multi-faction long-horizon balance evaluation; this is not final Total War-level fidelity.
