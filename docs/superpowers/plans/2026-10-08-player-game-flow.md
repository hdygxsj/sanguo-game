# Player-first campaign UI

Goal: turn the existing strategy simulation into an understandable playable campaign, preserving saves, order validation, combat and training.

Design: a new-game dialog chooses a faction ruler or observation before creation. Persist the chosen ruler in turn-zero state. Keep map space clear: compact treasury/objective strip, contextual settlement actions, navigable minimap; remove technical labels from the default screen. Restyle faction and ruler drawers with existing portraits and in-game summaries. Convert presentation text to simplified Chinese without modifying stored names, identifiers or simulation data. Existing observation saves can still select a ruler through the command panel.

Scope: rulers are the supported player roles, not free-roaming individual generals. Every action continues to consume a turn using the existing command API; contextual buttons open a review form and never submit immediately.

Implementation checklist (inline execution, user requested no questions):

- [x] Red/green API test for turn-zero playerAgentId and invalid out-of-scenario selection; implemented schema and service persistence.
- [x] Red/green start-dialog tests for faction and observation selection; integrated lobby, collapsed training tools.
- [x] Red/green minimap tests for county focus and territory display; integrated projected map coordinates and selected location. This is a navigation map with a selected-city marker, not a camera-frustum overlay.
- [x] Red/green contextual commands: own city recruits/builds/marches, other city targets an expedition, observation explains role choice; preserved disabled replay/completed-state behavior. Added workspace integration test asserting construction selection without executing a turn.
- [x] Simplified display strings centrally using OpenCC t2cn without mutating stored data. Updated map search and static labels.
- [x] Added thematic faction/ruler summary, treasury/objective strip, responsive styles and compact map controls. Players initially focus their own seat.
- [x] 214 API tests and 179 frontend tests passed; both production builds passed. Browser verified ruler selection with original portraits, new Liu Bei campaign at turn zero, minimap selection of Pingyuan and city construction form showing cost 40, without submitting a turn. Browser error log empty. API restarted with creation schema; training process left untouched.
