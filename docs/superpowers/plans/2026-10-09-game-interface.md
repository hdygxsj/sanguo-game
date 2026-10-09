# Playable personnel and military interface

User delegates decisions without further questions. Keep the map primary, expose the existing personnel systems, and replace native selects throughout game panels.

1. Implement tested GameSelect: themed portal listbox, search, keyboard selection, escape/outside close, fieldset-disabled support and viewport positioning. Replace each native select without changing domain order semantics.
2. Document and expose the simulation's integer troop quantity as hundred-person companies. Input uses people in multiples of 100; convert to company counts at order submission. Scale map, roster, composition and new event prose consistently. Preserve existing budgets, trained feature values and stored snapshots.
3. Add explicit personnel navigation for appointments, equipment and family; open the chosen section, show household/pregnancy status and direct players to diplomatic marriage. Keep adulthood, captivity, relatedness and affordability validation.
4. Update interaction tests to exercise custom options, add display/conversion checks, run all suites/builds, and inspect the real UI without submitting orders in user saves.

Do not claim succession, guaranteed births, additional portraits or a new training result. Existing backend family lifecycle/equipment/commander logic is reused, not replaced by static cards.

## Verification

- API: 223 tests passed across 41 files; web: 184 tests passed across 46 files.
- API and web production builds passed. Vite still reports the existing large battle-workspace chunk warning.
- Reloaded the served build and opened an existing turn-zero campaign without submitting orders.
- Browser screenshots checked personnel tabs, expanded equipment/family sections, and the themed searchable popup in a narrow viewport. DOM contained zero native selects.
- Confirmed 3,600-person garrison, 600-person recruitment input, and cost of 18 (six hundred-person companies). Conversion tests reject nonmultiples such as 501.
- Browser error log was empty. Existing family lifecycle and equipment simulation reused; this UI pass does not implement succession or guarantee births.
