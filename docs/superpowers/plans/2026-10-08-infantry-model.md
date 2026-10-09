# Miniature infantry implementation plan

**Goal:** Replace close-map capsule garrisons with an original Blender-authored armoured spearman, without tactical controls.

**Design:** Muted iron lamellar rows, brown leather bindings, grey-green tunic, domed helmet, wooden shield and long spear. Ground-centred pivot; model faces Blender -Y / glTF +Z. Single vertex-colour runtime draw batch, below 12,000 triangles and 150 KB compressed. Static miniature, dynamic scene lighting, no collision or animation rig: existing city/army selection remains authoritative. The current 448-instance cap and fade-to-hidden behaviour stay unchanged.

Procedural capsules lack a readable historical silhouette; importing commercial game assets is unnecessary. Use an original reproducible Blender source and GLB, following the existing pasture horse pipeline. User explicitly delegates design choices and asks no questions; execute inline without approval interruption or commits.

- [ ] Add a binary GLB asset contract test (existence, geometry budget, ground pivot, colour data); observe missing-asset failure.
- [ ] Create `assets/blender/build_infantry.py`, save `han-infantry.blend`, export `han-infantry.glb`, render `qa-evidence/han-infantry.png`; inspect the render.
- [ ] Optimize using existing glTF Transform tooling; verify exported model bounds, material and triangle budgets.
- [ ] Integrate runtime geometry using existing loader/instancing conventions; replace capsule geometry without altering simulation or interaction. Verify tests/build and browser rendering.

Asset production and runtime verification are separate gates; an offline render alone does not prove in-game fidelity.

## Implementation evidence

Blender source and original 800×1000 inspection render generated and visually inspected. GLB optimized with glTF Transform 4.2.1 dedup then Draco, 491.43 KB → 34.04 KB. Asset contract first failed for a missing GLB, then passed the final binary's material names, triangle budget, normals and grounded bounds. Rebuilding the Blender script creates an uncompressed export and must be followed by those two optimization commands.

Runtime now loads the GLB, reuses existing material-to-vertex-colour batching, normalizes miniature height to 2 units and instances it at scale .009. Individual soldiers sample terrain height at their actual position and face consistently rather than random rotation. Existing cap, shadow threshold, fade and no-raycast behaviour remain. The geometry test failed before implementation and passed after it; all 144 web tests and web production build passed. Existing bundle-size warning remains.

Pending: browser visual/performance inspection of the shipped asset in the full map. This is a static garrison model, not yet separate archer/swordsman/cavalry army variants. The full-model quality goal remains active.

## Browser follow-up and placement correction

Inspected a temporary in-app browser tab against the served production build, existing campaign turn 22. At Puyang / 濮陽縣 (36 spear troops), 28.7× close view revealed the old fixed-offset formation standing in the river. Added `garrisonPlacement.ts`: deterministic formation-site search around the existing county, rejecting river corridors, off-map positions, steep slopes and adjacent foundation footprints. No safe site means no decorative formation, not fewer simulation troops. Positions are cached per terrain/site geometry, not searched every frame.

Two placement tests failed against the former fixed offsets, then passed. All 146 web tests and production build passed. Reloaded the same campaign and repeated the Puyang search and close zoom: four soldiers now stand on dry land to the left of the city; river clear. Continuous zoom-out restored the political map with Puyang selected, 36 troops and turn 22 unchanged. Screenshots were inspected in the tool conversation; no browser errors recorded. Temporary tab closed; user's tab untouched.

Before the placement correction, the close view reported 78 draw calls and 1,574,752 triangles. A post-reload DOM metric query timed out, so this is not a claimed after-fix performance benchmark or FPS guarantee. Dedicated low-end frame-time profiling and additional army variants remain outstanding. The global visual direction is still more schematic than the requested reference.
