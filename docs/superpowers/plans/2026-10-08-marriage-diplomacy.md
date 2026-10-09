# Marriage diplomacy

Extend existing diplomacy action/offer with optional marriage IDs. Peace+marriage means peace marriage, alliance+marriage means alliance marriage. Require >=40 gift, unmarried free adults, unrelated, proposal person's faction=sender and partner faction=receiver, partner not ruler. Reuse escrow/inbox/expiry, reserve participants while pending, revalidate before accepting. Acceptance transfers partner into sender faction, clears governorship, establishes spouse relation, and enacts treaty atomically. No cost beyond stated gift. Rejection/expiry refunds once. No automatic player acceptance. Childbearing follows existing same-faction lifecycle after migration.

- [x] Failing domain tests for acceptance/transfer, player inbox escrow/reservations/refund and invalid terms.
- [x] Integrate optional schema/types and shared family checks with diplomatic resolver.
- [x] Add diplomacy panel marriage controls and participant names in incoming offers; tests.
- [x] Run full tests/build and document remaining historical/art/succession/fairness scope.

## Evidence / remaining verification

152 tests passed (102 API / 50 web), production build and whitespace check passed. Existing large WebGL chunk warning remains. Three initial domain assertions and the new diplomacy UI action assertion failed before implementation. Added player acceptance regression proving escrow is not charged twice and captured participants invalidate acceptance.

Browser full marriage-diplomacy workflow not yet playtested; component test confirms outgoing named-partner order. No AI autonomous proposal selection introduced. Need incoming names/transfer visual QA and full API save/reload path. Mortality/succession, original art, broad roster refinement and genuine multi-faction winning-opportunity evaluation remain open. Treaty scoring currently reuses existing diplomatic score; no special romantic affinity model yet.
