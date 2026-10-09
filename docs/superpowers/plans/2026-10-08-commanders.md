# Commanders and Captives Implementation Plan

**Goal:** Make characters lead strategic armies and persist as captives after automatic combat; offer release and recruitment without tactical micromanagement.

**Architecture:** Army `commanderId` is the only command assignment; optional character `capturedBy` preserves compatibility. A pure command module supplies availability, bounded strength multipliers and capture handling. Existing orders carry an optional commander ID. One general cannot govern and march or command two armies. Arrival releases the command assignment when the army merges into a garrison.

**Rules:** Effective power = troops × (1 + command / 500), capped at 20% commander bonus. Resolve casualties in troop units by dividing damage by each side's power multiplier; never create troops from bonuses. Weather and fortifications remain. Defeated non-ruler commanders are captured by a surviving enemy army/faction; ties and neutral defenders allow escape. Rulers escape in this foundation (succession/ruler captivity is not implemented). Captives cannot serve, receive rewards or collect salary. Release returns them to a still-active original faction, otherwise they become unaligned. Persuasion above 50 loyalty costs 10 and lowers old allegiance by 15; at 50 or below, recruit costs 30 and assigns loyalty 50. No executions. Captor elimination frees their captives. AI uses the same availability and bounded bonuses.

- [x] RED: domain tests for commander validation, bounded combat/casualties, field and siege captivity, peaceful arrival, salary exclusion, release/recruit and immutable snapshots.
- [x] GREEN: integrate types, schema, rules, marching, character availability and AI selection. Keep uncommanded army outcomes unchanged.
- [x] RED/GREEN: player commander selection and captive panel tests; implement in existing drawers and field army list.
- [x] Full API/web suites, builds, review and browser checks; record remaining scope.

Commands: `pnpm --filter @agent-arena/api test`, `pnpm --filter @agent-arena/web test`, both package `build` commands, `git diff --check`. No model/art changes or new balance claim in this batch.

## Evidence — 2026-10-08

- 60 API / 42 frontend tests pass; production builds and whitespace check pass. Large WebGL chunk warning remains.
- Independent review found exact siege ties capturing generals; a failing regression reproduced it and now passes after using no captor on ties.
- Browser in existing agent-created personnel test save: sent 20 soldiers from Puyang toward Luoyang with Bian Furen; turn advanced 1→2, garrison fell 36→16, commander disappeared from available selection. Governor Xun Yu was correctly absent from commander options. No tactical battle UI introduced.
- Captive lifecycle verified by domain tests and UI command test; no browser capture/recruitment end-to-end claim yet. Character statuses are explicit for commanding/captured. AI assignment is rule assistance, not new training.
- Full troop types, persistent regiment compositions, supply, retreats, equipment, families, portraits, ruler captivity/succession and genuinely balanced faction victory rates remain unfinished goal work.
