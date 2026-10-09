# Family lifecycle

Four turns represent one year for recorded ages. Eligible free married adults sharing a faction can conceive on a deterministic seasonal roll (25%), with 20 treasury cost, three-turn gestation and eight-turn post-birth interval. Mothers must be 18–44 at conception; no conception while either parent commands an army. Birth records both parents, a stable child ID and age zero, using the mother's current faction (no forced transfer of prisoners). Child upkeep is 1 per turn; children do not serve, lead troops, marry, receive equipment or suffer office loyalty decay. Old missing ages retain old adult gameplay eligibility but never become marriage-eligible implicitly.

- [x] Test deterministic birth records, aging, idempotent settlement, child restrictions and shared-ancestor marriage exclusion.
- [x] Integrate lifecycle settlement and age restrictions, show pregnancy/children/age in family UI.
- [x] Run all tests/build; keep mortality, succession, cross-faction marriage and historical genealogy incomplete explicitly.

## Verification and limits

147 tests passed (98 API / 49 web), production build passed, whitespace check passed. Existing WebGL chunk warning remains. Three initial lifecycle assertions failed before implementation; pregnancy/child UI assertion also failed before implementation. Added deterministic conception/fee/captivity/insufficient-funds tests. No browser-born-child playthrough claimed in this batch; pregnancy and child rendering verified by component tests.

Recorded ancestors prevent parent/descendant and any shared-ancestor marriage, with cycle-safe traversal. This is stricter than some historical marriage rules and only knows recorded genealogy. Scenario adult ages are still fictional sandbox values. Mortality and succession are not implemented, so adults currently keep aging without dying. No autonomous AI marriages yet. Cross-faction proposals and historical portrait production remain open.
