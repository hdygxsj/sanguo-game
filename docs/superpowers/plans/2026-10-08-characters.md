# Characters and Governors Implementation Plan

**Goal:** Introduce persistent named characters, governors, salaries and consequential loyalty, with ruler controls and equal AI access.

**Architecture:** Optional character records in snapshots preserve legacy saves. New historical scenarios receive three characters per faction. Character actions use the existing authenticated one-order-per-turn pipeline. A pure character module owns validation, governance estimates and settlement; no separate mutable database table.

**Design:** Use a collapsed personnel drawer with the existing muted parchment interface. Appointment costs 10, reward costs 15 and restores 15 loyalty; each employed person costs 1 per turn, governor costs 2. Governor bonus at their owned county is floor(politics × loyalty / 2500), capped at 4; it is not multiplied across the entire empire. Only one governor per county; transfer is atomic. Lost counties remove the office before income; low loyalty affects yield, unpaid salaries cost 12 loyalty, zero loyalty means resignation. Rulers stay with their faction. Attributes/initial assignments are original sandbox balancing, not same-year history. Portraits, battlefield command, aging and families remain later layers.

- [x] Add failing domain tests for unique historical roster, ownership/office checks, immutable appointment, salary/revenue, capture, unpaid resignation, legacy compatibility and AI legality.
- [x] Implement character records and actions in domain types, generate, rules, resolution, server schema and AI initiatives; mirror shared frontend types.
- [x] Add failing personnel UI tests; implement roster, appointment, removal and rewards using the same validator; expose through one map-side drawer.
- [x] Run full API/web tests and production builds; browser verify a new scenario, selection, appointment and persisted office. Keep original saves intact.

Verification commands: `pnpm --filter @agent-arena/api test`, `pnpm --filter @agent-arena/web test`, `pnpm --filter @agent-arena/api build`, `pnpm --filter @agent-arena/web build`, `git diff --check`. Tests must first fail on missing behavior before implementation. Keep work on existing codex branch; no automatic commit of unrelated dirty files.

## Evidence and remaining scope

- 2026-10-08: 53 API tests and 39 frontend tests pass; both builds pass. Existing large WebGL chunk warning remains.
- New 16-faction scenarios have 48 unique characters (historical and literary); no retroactive insertion into old snapshots. This is the starting roster, not all requested major characters.
- Browser test: selected Cao Cao, appointed Xun Yu in Puyang, treasury settled at 83, governance +2, salaries 4, loyalty 76. Reload preserved the office. Turn-zero replay correctly showed unappointed Xun Yu at loyalty 75, treasury 80, and disabled orders.
- Independent reviewer found replay using live personnel. Reproduced with a failing test (90 instead of 40 loyalty), fixed to viewState; regression passed. Screenshot review also corrected unreadable default secondary buttons and header styling. No browser warnings/errors observed.
- AI personnel management is periodic rule assistance, not trained character decision-making. No new faction-balance claim. Portraits, full differentiated roster, commanders/troop types, captives, family/aging, equipment and richer offices remain unfinished goal work.
