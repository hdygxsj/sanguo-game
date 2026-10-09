# Sloped city foundations

Preserve full square support at the existing terrain-derived top elevation; replace vertical box sides with an irregular outward-flaring skirt. Reuse one vertex-colored instanced geometry, existing placement, relief scaling, LOD and selection behavior. No simulation or save changes.

## Verification

- Added geometry regression for full support corners, wider lower rim, finite normals and matching vertex colors. Existing terrain-footprint support regression retained.
- Fixed explicit test array types after TypeScript caught implicit any arrays.
- `pnpm test`: 234 tests passed (158 API, 76 web).
- `pnpm build`: passed; existing large chunk warning remains.
- Background browser tab opened the existing turn-22 game, zoomed to 26.1x; city models and new skirts loaded, console errors empty. Did not advance the game or touch the user's original tab.

## Remaining visual limitation

The near-view screenshot still shows conspicuous dark, hard foundation edges, especially larger city sites. This is not a finished natural-terrain blend and not evidence that the overall model-quality goal is complete. Further skirt/terrain contact and lighting refinement is needed.
