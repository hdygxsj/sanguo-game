# Diplomacy Implementation Plan

**Goal:** Make ceasefires, alliances, trade and war mechanically meaningful in the strategic campaign.

**Architecture:** Symmetric pair-keyed relations and escrowed pending offers live in immutable battle snapshots. New scenarios start at war for continuity with the existing conquest simulation; negotiation changes that state. Player recipients decide on offers; AI recipients evaluate relations, relative strength and gifts. One diplomatic order consumes the existing faction order slot.

- [x] Test accepted peace blocks attacks and field battles; truce blocks immediate war; trade pays both active partners once; gifts transfer only on acceptance; pending gifts refund on rejection/expiry; other factions cannot answer a player's offer.
- [x] Add domain diplomacy data, validation, scoring, resolution and periodic rule-based AI initiatives; integrate income, marching and action schemas.
- [x] Halt in-flight armies at non-hostile destinations without changing ownership; resumes when legal. Preserve army soldiers, upkeep and saved positions.
- [x] Add diplomacy drawer with relations, treaty proposals, gifts and pending responses, disabled in replay. Keep map primary.
- [x] Verify domain/API/UI tests, builds and browser flow.

## Verification — 2026-10-08

- Full suite: 48 API tests and 36 frontend tests passed; both production builds passed; `git diff --check` clean. Existing large frontend chunk warning remains.
- Browser on agent-created historical test save: paid ceasefire accepted on turn 4, immediate war disabled, trade accepted on turn 5, alliance accepted on turn 6 (protected until turn 14); repeated alliance disabled. No browser warnings/errors observed.
- Independent review found an all-halted hostile-contact edge case. Added a failing regression, changed the movement loop to process stationary contact, then reran the complete suite successfully.
- Rebuilt local server restarted; browser alliance flow verified against the restarted server. User's existing saves retained.
- Remaining limitation: halted armies cannot yet be manually redirected; they resume when the route becomes legal. Diplomacy is rule-assisted and does not establish balanced faction win rates. Full character/family systems and expanded learning evaluation remain separate unfinished goal work.

This is not yet vassalage, marriage diplomacy, captive exchange or coalition victory. Those depend on subsequent character/family layers. Diplomatic decisions are rule-assisted, not falsely described as a trained neural diplomacy model.
