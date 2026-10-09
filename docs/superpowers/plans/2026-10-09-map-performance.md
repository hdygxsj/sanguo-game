# Campaign map rendering performance

Scope: render-only optimization; no campaign, economy, pathfinding or save changes.

## Measured baseline and hotspots

Local in-app browser, 682 × 869 CSS pixels, DPR 2, existing QA campaign at turn 4. This is not an external Chrome hardware benchmark.

- Static overview: render counter rose 1337 → 6235 over 40.559 seconds (~121 submissions/second despite no input).
- Overview: 4 draw calls / 299,218 triangles per frame. Full 384-segment terrain was submitted even at minimum relief.
- Near view: up to 78 draw calls / 3,409,526 triangles observed. Instance preparation, formations and shadow maps ran on every frame even while idle. Active near-view GPU profiling remains follow-up work; no FPS improvement percentage is claimed.

## Changes and verification

- Demand rendering continues throughout camera, model and county fades; input, zoom buttons, React scene updates and asset completion wake it. Clamp first resumed camera delta to avoid jumping after idle.
- Overview uses 96-segment terrain; original 384-segment mesh remains for zoom > 1.3, before significant relief becomes visible. Both meshes retain identical world coordinates, textures and selection semantics.
- A DOM canvas frame counter allows repeatable read-only checks.
- Demand-only build: idle overview counter stayed 2 for 32.863 seconds; near-view counter stayed 104 for 38.849 seconds. Selecting an army woke the scene and completed its zoom/model transition.
- Final build overview: 22,738 triangles / 4 draw calls (~92.4% fewer triangles). Zoom button to 1.6 restored the detailed mesh (335,170 total scene triangles including newly visible detail).
- Browser checked: overview screenshot, near army screenshot, select army, zoom buttons, reverse reset, diplomacy palette, pointer drag. Console errors empty. No turn advanced or game order submitted.
- 199 web tests / 53 files passed; production build passed. Existing Three.js duplicate-import test warning and large-bundle warning remain.

## Budgets and limits

Idle target: no continuous scene submissions, verified. Active target: 60 FPS / 16.7 ms frame time is a proposed goal, not measured or guaranteed here. Memory/load-time budgets are not established. Next profiling priority is active near-view model/shadow cost, then per-frame vegetation sorting; avoid reducing model quality without measured need.
