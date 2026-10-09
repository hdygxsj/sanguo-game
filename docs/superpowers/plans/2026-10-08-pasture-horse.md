# Original Blender pasture horse

Replace the runtime sphere/box horse with an original editable Blender asset, without altering resource placement or gameplay. Source: `assets/blender/build_horse.py` and `pasture-horse.blend`. Fused coat anatomy, separate mane, tail, eyes, ears, muzzle and hooves; rough chestnut materials. This improves structure but remains stylized, not final photorealistic artwork.

Shipping GLB: 9,030 triangles, 31,996 bytes after Draco compression. Runtime bakes transforms and material colors into one instanced geometry, normalized to 2.2 units long and ground-aligned. Existing LOD, placement, opacity and non-interactive raycast remain. Test checks normalization, finite normals, vertex colors and source geometry preservation.

Verification: 249 tests passed (166 API / 83 web). HTTP 200 returned byte-identical compressed asset. Temporary browser tab entered existing turn-22 save, searched 冀縣 and zoomed to 17.9x: horses visible beside the settlement and pasture fence; no browser error logs. No turns advanced or saves changed. Blender catalog render: `qa-evidence/pasture-horse.png`.

Visible remaining shortcomings: landscape materials remain broad and plain, rocks lack detail, city foundations still prominent, horse surface detail needs further art passes. Do not describe all requested model polish as complete.
