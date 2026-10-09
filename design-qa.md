# Agent Arena Design QA

## Evidence

- Source capture: `qa-evidence/source-agent-arena.png` (1329 × 768 physical pixels). The browser chrome occupies the top 137 px; the comparison crop uses the 1329 × 631 page region.
- Implementation desktop: `qa-evidence/implementation-desktop.png` (1280 × 720). In-app Chromium reported a 1280 × 720 CSS viewport at DPR 2.
- Implementation mobile: `qa-evidence/implementation-mobile.png` (390 × 844). Headless Chrome used a 390 × 844 CSS viewport at DPR 1.
- Full comparison: `qa-evidence/comparison-desktop.png`.
- Focused workspace comparison: `qa-evidence/comparison-workspace.png`.
- State under test: authenticated seeded battle, turn 0, live WebSocket connected, WebGL unavailable so the Blender-rendered arena fallback is active.

## Visual assessment

- Typography: compact Chinese sans-serif headings, spaced uppercase metadata, and tabular turn counters reproduce the source hierarchy without clipping at either tested viewport.
- Spacing and composition: the desktop workspace preserves the source's dense left-status / central-arena / right-events topology. The 390 px layout intentionally prioritizes the arena and replay controls, moving secondary panels below the fold.
- Color and surfaces: ink-black canvas, graphite panels, restrained violet borders, lavender primary action, and green connection status match the reference design language.
- Image and 3D quality: the fallback is an original 1280 × 720 Blender render of the same local GLB kit rather than a placeholder. In WebGL-capable browsers the interactive R3F scene uses the eight authored model roots.
- Copy and icons: visible Chinese controls are concise and consistent; icons have accessible button labels and no broken glyphs.
- Responsiveness: desktop and 390 × 844 captures show no horizontal page overflow, overlapping headings, clipped primary controls, or unusable tap targets.
- Accessibility: landmark headings, labelled buttons, a labelled replay slider, visible focus styling, reduced-motion handling, and a DOM-equivalent city-label layer are present.

## Comparison history

1. **P1 — production page rendered blank.** Cause: the static server returned `index.html` for hashed JavaScript. Fixed wildcard static serving; post-fix browser capture renders the complete workspace.
2. **P1 — demo login failed.** Cause: a JSON content type was sent with an empty request body. Fixed the API client to add the header only when a body exists and added a regression test.
3. **P1 — realtime status remained local.** Cause: the WebSocket plugin was registered outside Fastify's plugin lifecycle and upgrade parsing was brittle. Fixed plugin registration plus cookie/query parsing; post-fix UI reports `实时连接`, and an end-to-end socket run received ordered turn events.
4. **P2 — WebGL-disabled browsers showed an empty battlefield.** Added a real Blender-rendered fallback with live DOM city labels and state overlays.
5. **P2 — persistent controls could clip at short desktop heights.** Reworked workspace sizing and the replay/action rows; the 1280 × 720 capture shows all critical controls.
6. **P2 — mobile secondary panels competed with the playfield.** Reordered the responsive layout so the battle title, connection state, arena, and replay remain visible in the first 390 × 844 viewport.

## Refined model set

- Editable source: `assets/blender/arena-kit.blend`
- Runtime kit: `apps/web/public/models/agent-arena/arena-kit.glb`
- Hero render: `apps/web/public/images/arena-fallback.png`
- Eight-model catalog: `qa-evidence/arena-model-catalog.png`
- Deterministic generator: `assets/blender/build_arena.py`

The 1920 × 1080 catalog confirms distinct silhouettes for two villages, fort, citadel, stronghold, imperial palace, mountain, and grove. Roof ribs, upturned corners, timber frames, lattice windows, stairs, walls, crenellations, towers, banners, lanterns, courtyard props, vegetation, and rock details remain legible from the strategy camera.

| Model check | Result | Budget |
| --- | ---: | ---: |
| Runtime roots | 8 | exactly 8 |
| Shared materials | 11 | exactly 11 |
| Exported mesh batches | 58 | at most 88 |
| Total triangles | 67,042 | 25,000–120,000 |
| Draco GLB | 737 KB | below 4 MB |
| Blender source | 4.3 MB | below 25 MB |
| Image textures | 0 | 0 |

`pnpm assets:build` passed the Blender build, quality gate, hero render, and catalog render. `pnpm verify` passed 18 API tests, 8 web tests, type checking, production builds, GLB contract verification, and database setup. A production browser smoke test reached one active WebGL canvas with the fallback hidden and displayed the refined city models. The first navigation retained an obsolete JavaScript chunk URL from the prior local server; reloading the current production shell resolved that preview-session cache condition.

## Final gate

- P0 remaining: 0
- P1 remaining: 0
- P2 remaining: 0
- Expected console noise: the anonymous bootstrap probe returns HTTP 401 before demo login; no uncaught JavaScript or asset errors were observed after loading the current production shell.

final result: passed

## 2026-10-07 — compact Han county strategy map

- User feedback: geography leaves too much empty travel/viewing space between counties.
- Default historical-map view now uses a monotone, density-aware cartogram. Sparse bands shrink more than dense county clusters; geography mode remains available for comparison.
- 1,184 county identities, 105 commanderies, roads, ownership, troops, policy snapshots and replay data are unchanged. The transformation is display-only, not a change to movement costs or AI observations.
- Rivers and coastlines split at projection breakpoints so every county remains on land. Mountains, province labels and seat coordinates share the projection.
- Measured world-space inter-commandery links: average 2.176 → 1.387 (36.2% shorter); longest 6.830 → 3.838 (43.8% shorter). These are display units, not historical distances or screen-pixel guarantees.
- Existing battle Y7MG5L loaded the default compact view without recreation. Browser checks verified geography/compact toggling, simplified search “长沙”, 13 matching counties, and selection of 臨湘縣 with focused buildings/roads.
- Automated checks: 22 API tests and 12 frontend tests passed; typecheck and frontend production build passed. Existing large Three.js bundle warning remains.

## 2026-10-07 — territorial strategy display

- Replaced the Han model view with a flat SVG cartographic display at every zoom level, including expanded map and minimap. Legacy Blender/Three.js scenes remain available only to old grid battles via a lazy import.
- 1,184 nonempty county cells tile the map extent; coastline clipping prevents ocean territory. Thin county borders and heavier inter-commandery edges distinguish the two levels. Game partitions are explicitly labeled as schematic, not historical boundaries.
- Neutral earth-tone fill and live faction fill are independent of cached geometry. Automated conquest and replay tests verify recoloring without changing county identities.
- Restored mountain sketches, named rivers, farmland hatching and farm/ore/horse markers. Horse markers are scenic grassland landmarks, not new simulation income or cavalry production.
- Added wheel/button/keyboard zoom, pointer panning, county focus, an expandable viewport, layer toggles, neutral/faction/resource legend and a model-free minimap. Resource icons are thinned at overview scale to reduce overlap.
- Browser smoke test opened existing battle Y80UFA, confirmed county boundaries and resource symbols, then expanded the map at close zoom with no buildings/models. Readability review led to a backed legend and scale-aware farm hatching.
# 2026-10-07 · Continuous political / terrain map

The previous SVG-only direction is superseded by the user's continuous-zoom request. React/R3F, the existing Blender GLB, all 1,184 counties, the compact coordinate projection and backend road/turn data are reused. SVG remains the WebGL fallback.

## Verified behaviour

- One orthographic scene and triangulated height field; actual terrain relief changes from 0.035 to 1.0 while the political atlas blends into the natural ground material. No DOM-map/model-size-only substitution.
- Background browser QA on the existing completed Y80UFA replay (no turns advanced): 1.00× = political 1.000, relief 0.035, models 0.000, 3 draw calls; 4.10× = political 0.464, relief 0.769, models 0.586, 69 calls; 11.20× = relief/models 1.000, selected county 0, 84 calls. Draw-call numbers are observed scene samples, not a hardware/FPS guarantee.
- Reverse wheel input returned to 1.00×, political 1.000, models 0.000, selection still county 0, 4 calls (including selection outline). Browser warning/error log empty during these checks.
- Gray roof materials, smaller natural-shaped instanced foliage, farms, mines, scenic horse pastures, roads, flags and miniature troops are anchored to the same terrain. Building footprint scales with county spacing and city level; the cached Blender source materials are not mutated.
- Independent review caught stale instance picking bounds, labels not updating after settled-zoom pans, and hard nearby-county membership changes. Bounds invalidation, throttled camera-position publication and per-county fade weights fix these. Up to 56 steady-state city models, with 112 slots solely for overlapping region transitions; new admissions wait rather than evict visible outgoing instances. Fully faded models have raycasting disabled.
- Tests cover continuous/reversible weights, shared terrain triangle sampling, 1,184 counties/roads, live and replay territory ownership, instance hit tests after movement, and bounded per-county LOD admission. Final full suite: API 22 + web 26 = 48 passing; typecheck and production build passed. One preceding concurrent browser/test run hit the SVG test's 5-second timeout; isolated rerun and full rerun both passed without extending the timeout.

## Deliberate limits

- Geography, elevation and county polygons are gameplay schematic, not reconstructed historical surveys. Horse locations are scenic and do not add cavalry income. Existing rules, learning policy, saves and turn resolution are unchanged by this renderer.
- This is a Total War-inspired map transition, not reproduction of that game's proprietary assets or full AAA environment. Armies remain miniature markers, not fully animated formations. No atmospheric postprocessing is required for the current natural-light scene.
- Vite still reports the existing large WebGL workspace chunk (~997 kB before gzip); GLB loading itself is deferred until 1.6×. No desktop/mobile FPS certification is claimed.
# 2026-10-07 · Close-zoom clarity follow-up

- Root cause: the 2048² whole-country overview atlas painted its ground in 4×4 pixel cells. Magnifying it 32× also magnified baked riverbanks, borders and farm rows. The old UV-quantized grain did not restore that lost detail.
- Near ground now uses smoothly interpolated, world-coordinate procedural colour before PBR lighting; derivative attenuation limits distant high-frequency shimmer. The overview atlas remains for political colours and coastline masking, not near ground detail.
- River banks and farm furrows are separate terrain-draped, vertex-coloured geometry. Commandery borders are draped vector lines. Ground resolution increases from 192 to 384 subdivisions per axis, retaining a single shared triangle sampler for anchors.
- Tree crown vertices are welded before smooth-normal generation; rock geometry is subdivided. Existing Blender buildings now receive shadows. Shadow resolution is 2048² over a tighter near-camera area; normal bias is reduced for miniature scale. Canvas uses 1.5–2× sampling plus MSAA.
- A 32× browser inspection at the same Luoyang county showed continuous ground colour and crisp geometric farms/riverbanks, without the previous block pattern; console warnings/errors were empty. The source GLB buildings were retained, not replaced with newly authored high-poly assets.
- Added shader integration and draped-feature geometry tests. This pass does not change gameplay or map coordinates. Additional near geometry/supersampling trades GPU work for clarity; no FPS improvement is claimed.
# 2026-10-07 · Playable-layout density follow-up

- Tightened the existing monotone density-aware coordinate warp, not a uniform model/map scale. Empty-band scale falls from 0.16 to 0.045; saturated populated bands retain 0.875 / 0.90 (97.2%) of their previous spacing.
- Compact map bounds now measure 13.7014 × 13.9383 units, versus approximately 18.32 × 18.03 previously: about 42% less bounding-rectangle area. All 1,184 county identities, 105 commanderies, road edges and backend coordinates remain unchanged. Area here means display-world footprint, not occupied screen pixels or removed territory count.
- Mountain polylines are now densified through the same piecewise transform as coastlines/rivers. Random foliage candidates scale with display area (22 candidates per square unit, capped at 10,000), reducing non-interactive decoration rather than overcrowding the smaller map. Full-map camera padding tightened from 0.82 to 0.90.
- Browser checked the expanded political overview and retained county index; no console warnings/errors. Geographic-reference layout remains available. This change does not implement the separately discussed economy, unlimited turns or marching systems.
