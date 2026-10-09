# Neutral talent roster and recruitment

New campaigns retain the original 48 owned staff IDs and add 16 neutral adult sandbox figures. Source: apps/api/src/domain/talents.ts. Ages and abilities are gameplay settings, not a same-year historical reconstruction. Existing saved campaigns are not automatically migrated.

Recruitment action: recruit-character, cost 40 + ceil(max(politics, command)/2), consumes the faction turn, joins at 55 loyalty, then follows ordinary payroll/office/command/family rules. Reject owned, captive, minor, ruler or commanding targets. New characters have no original portraits yet and show an explicit placeholder rather than another person's art.

Player entry: PersonnelPanel → collapsed TalentsPanel. Also usable when the faction has no existing staff. Added roster/recruitment and UI cost tests. Birth regression changed from hard-coded total 7 to initial count + 1 while retaining uniqueness/age/parent assertions.

Outstanding: AI recruitment priorities, new portraits, wider historical roster, recruitment HTTP integration coverage and live browser checks. Training session 41000 does not include this change: it loaded modules before new roster creation.

## AI follow-up

AI now hires only for an unfilled governorship after existing staff/loyalty priorities. Candidates use the same validation and cost as player orders. Reserve includes 10 appointment fee, 100 cash and 20 turns of projected deficit including a new governor's salary, field armies and trade. No automatic personnel initiative for the player. Two regressions observed failing before implementation, then passed; full suite at that point 310 tests and production build passed. HTTP recruitment/replay regression added separately; run result must be checked before claiming it passes.

Remaining content work: 16 new portraits, additional major characters, regional availability and broader talent strategy beyond governorship needs. This does not establish faction win-rate balance.

HTTP follow-up passed all 8 server tests: recruitment deducts the 89-cost event, ownership and loyalty persist in replay, duplicate hire is rejected without version advancement. Uses isolated test.db, not user saves.
