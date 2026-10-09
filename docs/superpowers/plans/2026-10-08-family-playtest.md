# Family and marriage browser playtest

Scope: agent-created Cao Cao test save only; original user tab and other saves untouched. Test save advanced from turn 1 to 20. Temporary browser tab closed.

Verified through UI:
- Turn 1: selected Xun Yu + Gan Furen, peace-marriage gift 40 to Liu Bei.
- Turn 2: peace until turn 8, Gan Furen moved into Cao Cao's roster (3→4 members), family panel showed Gan Furen as Xun Yu's spouse. Reloaded and reopened save: relationship still present.
- Continued with hold orders through turn 20. Treasury showed pregnancy cost at turn 16; roster grew to five at turn 19. Cao An1 appeared at age zero; appointment and marriage disabled. This was a natural seeded event, not injected state.
- Screenshot-reviewed marriage record and child restrictions. No warning/error logs at marriage verification.

Findings fixed using failing regression tests:
- Child labelled idle officer/subject: now underage/dependent, with explicit appointment explanation. Rebuilt, reloaded and verified actual UI shows `曹安1 · 未成年`, `任职：家族抚养`, `未满 18 岁，不能任职。`.
- Family/equipment events omitted from personnel notice: new notice selector prioritizes family, equipment and captive events above routine payroll, scoped to selected owner and replay turn.

154 tests passed (102 API / 52 web); build and whitespace check passed. Existing large WebGL chunk warning remains.

This closes outgoing peace-marriage persistence and natural childbirth browser verification. Incoming player marriage acceptance remains domain-tested, not browser-playtested. Mortality/succession, AI family proposals, polished assets/portraits, broader content and true faction-win balance remain unfinished.
