# Foundation contact and lighting correction

Previous goal turn made progress: introduced sloped instanced foundations and recorded remaining dark rims.

## Root causes and changes

1. Whole-cell terrain extrema included vertices outside a narrow building footprint. A planar regression expected top 0.551 but observed 1.001. Clip each actual terrain triangle against the footprint and take resulting polygon extrema. Retains interior peaks and support margin without arbitrary high pedestals.
2. Shared normals averaged the flat top, skirt and buried bottom. A top-face regression observed normal Y 0.410419 rather than 1. Split faces before computing normals. Shared instanced geometry remains 32 triangles, now 96 vertices; no additional draw calls or materials.

## Evidence

- Both new tests observed failing assertions before their respective fixes.
- Existing terrain support coverage retained; 236 tests pass (158 API, 78 web).
- Production build succeeds; existing large bundle warning remains.
- Background browser opened existing turn-22 game. Height-only build still showed black rims. After normal separation, near-view screenshot around 24x showed those dark bands gone and soil-colored skirts. No console errors.
- No simulation turn advancement, save migration, gameplay rules or original user tab changes.

## Outstanding scope

This fixes a visible lighting defect, not the complete art target. Bases are still visibly rectangular, terrain and rivers remain stylized, full portrait coverage and demonstrated major-faction victories remain incomplete. Broad goal remains active.
