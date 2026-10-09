# Continuous riverbanks implementation plan

Goal: remove disconnected river-bank joins and hard color bands without moving original river coordinates, carving or simulation data.

Architecture: sample each entire polyline once, deduplicate zero-length segments, share an averaged bounded join normal, and interpolate vertex colors across the river profile. Reuse the single terrain detail mesh and current terrain height sampling. No new textures or draw calls.

- [x] Inspect terrainDetail.ts and terrainField.ts; existing implementation builds independent constant-color strips per segment.
- [x] Add and run failing terrainDetail.test.ts regression for one shared bend, exact endpoints and duplicate points.
- [x] Implement riverSections in terrainDetail.ts with maximum .018 sample spacing and averaged unit normals at joins.
- [x] Replace per-segment ribbons with shared section vertices, with six profile colors interpolated across five strips.
- [x] Run pnpm test and pnpm build. Verify near-view screenshots and browser errors without advancing the existing game.

Alternatives: altering the river spline would require synchronized carving and map rendering changes; increasing texture resolution would not fix geometric seams. This step keeps centerline fidelity and addresses the visible strip construction directly. Broader natural river meandering remains outside this incremental correction, not outside the full goal.

Verification: 237 tests passed (158 API, 79 web); production build passed with existing large-chunk warning. Temporary browser tab opened turn-22 save and zoomed to 16.3x. River strip and bend visible, banks interpolate instead of separate flat-color stripes; console errors empty. City bases on the far bank still appear overly tall, and river remains an angular original polyline. These are outstanding art issues, not solved by this patch. No save changes or turn advancement.
