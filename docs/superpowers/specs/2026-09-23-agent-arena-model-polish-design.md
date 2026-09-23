# Agent Arena Model Polish Design

## Objective

Replace the current blockout-quality arena kit with a cohesive, production-quality stylized Chinese strategy-game asset set while preserving the eight runtime root names, editable Blender source, deterministic generation, browser GLB contract, and fast repeated rendering across the battle map.

## Art Direction

The kit uses an elegant low-poly miniature aesthetic rather than photorealism. Strong silhouettes must read from the existing elevated strategy camera: layered hip roofs with lifted corners, dark timber frames, warm plaster, carved stone bases, glowing amber imperial accents, and controlled jade/cyan highlights. Detail is expressed through geometry and material contrast rather than texture files so the asset stays crisp, editable, and compact.

The eight roots become visually distinct:

- `village-a`: riverside hamlet with a gate pavilion, two homes, fenced garden, well, and clustered pines;
- `village-b`: hillside market village with three staggered homes, stalls, lantern posts, grain jars, and a watch platform;
- `fort`: compact walled garrison with crenellations, gatehouse, corner towers, drill yard, banners, and barracks;
- `citadel`: double-court defensive seat with raised main hall, covered side galleries, stone stairs, and larger gate towers;
- `stronghold`: layered military complex with an inner keep, secondary walls, siege-ready towers, beacon braziers, and command banners;
- `imperial`: three-tier palace city with amber glazed roofs, throne hall, ceremonial stairs, paired gates, pavilions, courtyards, and imperial standards;
- `mountain`: multi-peak slate formation with stratified rock faces, moss shelves, stone arch, and wind-shaped pines;
- `grove`: varied pine and deciduous cluster with rocks, ground foliage, a small shrine lantern, and an asymmetrical canopy.

## Geometry Language

Reusable procedural primitives provide consistent construction:

- beveled plinths, walls, steps, stairs, columns, lintels, and stone blocks;
- true four-slope hip roofs with overhang, lifted corner ornaments, ridge caps, and visible tile ribs;
- bracket sets, lattice windows, recessed doors, railings, fences, crenellations, arches, banners, lanterns, jars, wells, braziers, and courtyard pavers;
- faceted rock clusters with layered ledges and controlled vertex variation;
- tapered tree trunks with multi-volume foliage rather than single icospheres.

All detail must remain legible at city scale. Micro-detail smaller than a few screen pixels is excluded.

## Materials and Lighting

The existing eleven stable material names remain the runtime contract. Their Principled BSDF properties are upgraded with deliberate roughness, metallic, specular, and subtle emissive values. Amber glaze and lantern/imperial accents may emit softly; stone and plaster receive high roughness; roof edges and slate use controlled metallic response. No remote textures or image dependencies are introduced.

The preview uses a museum-diorama setup: dark teal ground, warm key light, cool rim light, soft area fill, contact shadows, atmospheric world color, and an isometric camera. A second contact sheet renders all eight roots individually for quality review.

## Browser Performance Contract

The authored scene may contain many construction objects, but export consolidates each root by material. Each root therefore ships with no more than eleven mesh children and reuses the global eleven materials. Applied transforms, ground-level origins, stable names, and meter units are mandatory.

The kit targets:

- 25,000–120,000 total exported triangles;
- no more than 88 exported mesh nodes;
- GLB below 4 MB;
- `.blend` below 25 MB;
- no textures, animations, cameras, or lights in the GLB;
- no collision meshes because the current arena has no physics;
- one detailed strategy-camera LOD because camera distance is bounded and geometries are shared by cloned R3F scenes.

## Verification

The Blender verifier must reject the old blockout and enforce per-root polygon minimums, material coverage, applied transforms, ground pivots, child-count budget, sensible bounds, and the global polygon budget. The Node verifier checks GLB structure, names, material count, file size, texture absence, and mesh budget.

Final QA requires:

- successful deterministic rebuild of `.blend`, `.glb`, fallback render, and contact sheet;
- Blender and Node asset verifiers passing;
- visual inspection of the preview and contact sheet at original resolution;
- successful frontend test, typecheck, and production build;
- browser inspection showing the refined assets or refined Blender fallback without layout regressions.

## Scope

This phase changes asset quality and asset verification only. It preserves battle rules, backend APIs, city placement, root names, and material names. Runtime scene-light tuning is allowed only where necessary to show the upgraded materials accurately.
