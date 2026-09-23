# Agent Arena Model Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all eight Blender arena roots as polished, visually distinct, browser-ready strategy-game models with strict quality and performance verification.

**Architecture:** `build_arena.py` remains the deterministic source of truth and gains reusable architectural, prop, vegetation, consolidation, and export helpers. `verify_arena.py` becomes the Blender quality gate, while `scripts/verify.mjs` validates the exported GLB contract. Render scripts produce a hero fallback and eight-model contact sheet for visual review.

**Tech Stack:** Blender 4.5 Python API, glTF/GLB 2.0, React Three Fiber runtime contract, Node.js verification, PNG render evidence.

---

## File Map

- Modify `assets/blender/build_arena.py`: refined material setup, procedural primitives, eight asset compositions, material batching, export.
- Modify `assets/blender/verify_arena.py`: per-root visual-complexity, hierarchy, transform, bounds, and budget assertions.
- Modify `assets/blender/render_preview.py`: polished diorama lighting and hero composition.
- Create `assets/blender/render_catalog.py`: deterministic contact-sheet source renders for all eight roots.
- Modify `scripts/build-assets.sh`: build, verify, render hero, and render catalog.
- Modify `scripts/verify.mjs`: exported GLB size, mesh/material/texture budget checks.
- Generate `assets/blender/arena-kit.blend`, `apps/web/public/models/agent-arena/arena-kit.glb`, `apps/web/public/images/arena-fallback.png`, and `qa-evidence/arena-model-catalog.png`.

### Task 1: Strengthen the asset quality gate

**Files:**
- Modify: `assets/blender/verify_arena.py`
- Modify: `scripts/verify.mjs`

- [ ] Add per-root triangle minimums and a global triangle budget in Blender:

```python
MIN_TRIANGLES = {
    "village-a": 900,
    "village-b": 1100,
    "fort": 1600,
    "citadel": 2400,
    "stronghold": 3200,
    "imperial": 4500,
    "mountain": 900,
    "grove": 700,
}
triangles = sum(len(poly.vertices) - 2 for child in root.children if child.type == "MESH" for poly in child.data.polygons)
if triangles < MIN_TRIANGLES[root_name]:
    fail(f"{root_name} needs {MIN_TRIANGLES[root_name]} triangles, found {triangles}")
```

- [ ] Require 2–11 mesh children per root after material batching, applied scale, ground-level root origins, unique dimensions, and at least four assigned contract materials per architectural root.
- [ ] Extend the Node verifier to reject GLBs above 4 MB, more than 88 meshes, any image/texture payload, or a material count other than eleven.
- [ ] Run the old asset against the new gate and confirm it fails on triangle/detail thresholds.
- [ ] Commit the failing quality contract.

### Task 2: Build refined reusable primitives

**Files:**
- Modify: `assets/blender/build_arena.py`

- [ ] Add deterministic helpers for bevelled boxes, custom prisms, roof shells, upturned roof corners, tile ribs, ridge ornaments, stairs, columns, brackets, lattice windows, railings, banners, lanterns, jars, wells, braziers, fences, and courtyard pavers.
- [ ] Upgrade the eleven materials with explicit roughness, metallic, specular, and emissive settings while preserving names.
- [ ] Add a `consolidate_root_by_material(root)` pass that joins geometry sharing a material and restores stable child names such as `imperial--Imperial-amber-glaze`.
- [ ] Apply transforms after consolidation and verify every root remains at ground origin.
- [ ] Run Blender in background mode and confirm the generator completes without Python errors.
- [ ] Commit the primitive library.

### Task 3: Rebuild settlements and fortifications

**Files:**
- Modify: `assets/blender/build_arena.py`

- [ ] Compose `village-a` as a garden hamlet with two detailed halls, a gate pavilion, fence, well, stone path, and pines.
- [ ] Compose `village-b` as an asymmetrical market village with staggered halls, market stalls, jars, lanterns, and watch platform.
- [ ] Compose `fort` with a gatehouse, corner towers, crenellated wall, barracks, drill yard, banners, and stairs.
- [ ] Compose `citadel` with two courts, raised main hall, covered galleries, inner gate, larger towers, and layered paving.
- [ ] Compose `stronghold` with double walls, command keep, beacon towers, military yards, and high standards.
- [ ] Compose `imperial` with three-tier ceremonial axis, amber palace roofs, throne hall, paired pavilions, stairs, gates, and imperial banners.
- [ ] Build and run the Blender verifier; fix any per-root complexity or bounds failure.
- [ ] Commit the six refined architectural roots.

### Task 4: Rebuild natural assets and optimize export

**Files:**
- Modify: `assets/blender/build_arena.py`

- [ ] Compose `mountain` from layered custom rock prisms, moss shelves, arch opening, ledges, and varied pines.
- [ ] Compose `grove` from at least five distinct tree silhouettes, low ground foliage, rocks, and a shrine lantern.
- [ ] Consolidate every root by material, prune unused data blocks, and export GLB without cameras, lights, animation, or textures.
- [ ] Run Blender verification and Node structural verification.
- [ ] Confirm the GLB remains below 4 MB and the `.blend` below 25 MB.
- [ ] Commit the natural roots and optimized export.

### Task 5: Produce visual QA renders

**Files:**
- Modify: `assets/blender/render_preview.py`
- Create: `assets/blender/render_catalog.py`
- Modify: `scripts/build-assets.sh`
- Generate: `apps/web/public/images/arena-fallback.png`
- Generate: `qa-evidence/arena-model-catalog.png`

- [ ] Improve the hero render with bevelled terrain plinths, warm key, cool rim, soft fill, contact shadows, orthographic-isometric framing, and restrained volumetric atmosphere.
- [ ] Render each root on a consistent pedestal and combine the eight renders into a labelled 4×2 catalog image using Blender's compositor or Python image buffers.
- [ ] Add catalog generation to `scripts/build-assets.sh` after the Blender verification step.
- [ ] Run `pnpm assets:build` and inspect both PNGs at original resolution.
- [ ] Fix silhouettes, clipping, material contrast, and camera framing found in the inspection.
- [ ] Commit render scripts and regenerated deliverables.

### Task 6: Runtime and full verification

**Files:**
- Modify only if evidence requires it: `apps/web/src/arena/ArenaScene.tsx`
- Modify: `design-qa.md`

- [ ] Run `pnpm verify` with the bundled Node runtime and confirm all API/web tests, type checks, builds, Blender headers, and GLB checks pass.
- [ ] Start production mode, enter the seeded battle, and inspect all root types through the arena/fallback without console errors.
- [ ] Capture a final browser screenshot and update `design-qa.md` with model evidence, budgets, and remaining P3 notes only.
- [ ] Run `git diff --check`, commit the final QA evidence, and merge the branch into `main`.
