# Expanded roster implementation plan

Goal: expand the cross-era Three Kingdoms sandbox roster and add deterministic random officers with distinct generic portraits.

Architecture: preserve the existing 64 identities; expand to 428 named sandbox characters. Latest user revision: national policy → talent discovery, not a recruitment hall. Six new random adult officers and eight named discovery slots per turn; names/faces are deterministic within the turn, refreshing the page never rerolls. Existing legacy talents remain available. Unclaimed random offers expire; owned, previously recruited, captured or referenced characters persist. Portrait metadata is persisted; layered SVG portraits require no image downloads. Existing original named paintings retain priority. Missing named paintings use visibly labelled generic portraits rather than another named person's painting.

User requested autonomous implementation. No new campaign rules, free faction staff, copyrighted artwork, historical-year accuracy claims, or save replay rewrites.

- [x] Add failing roster tests: >= 200 named identities, uniqueness, representative late/early factions, deterministic random profiles, distinct seed, bounded stats, no historical-name collision, idempotent old-save upgrade preserving ownership.
- [x] Implement historicalRoster.ts, randomOfficers.ts and rosterExpansion.ts; extend optional CharacterState metadata and seed propagation in generate. Upgrade only latest active state in BattleService.get; replay remains raw.
- [x] Add portrait tests for stable generated faces and no named artwork substitution. Add GenericPortrait SVG component; retain minors and existing original portrait behavior.
- [x] Move searchable candidates into KingdomPanel policy tabs; remove recruitment controls from PersonnelPanel. Enforce named discovery membership server-side. Refresh at end of turn, after resolving recruitment, retaining paid recruits and stale-order rejection.
- [ ] Run API and web suites, build both, restart only the existing local API process after verifying its path, and inspect browser portraits/recruitment with no order submission.

Verification commands: API `DATABASE_URL=file:./test.db npx vitest run --testTimeout=15000`; web `npm test`; both `npm run build`. All shell calls use the configured bundled Node runtime.
