# Terrain-aware roads

Approved scope: fix roads, marching positions and costs together, not a decorative curve.

- Extract the existing pure compact projection, bank placement, settlement grading and terrain field into the API domain; web wrappers retain existing imports and tests. Use stable founding-level grading (seat 2, county 1) so ownership/building upgrades cannot move roads under marching armies.
- Add a sampled slope-limited route planner with tests for ridge avoidance, impassable walls, reverse symmetry and distance-based interpolation. No direct-line fallback when blocked.
- Cache deterministic terrain and routes by geometry. Backend routing and marching speed use the same paths as the default compact map. Preserve baseline geographic travel scale by multiplying original edge length by the actual compact-path cost ratio.
- Render sampled paths and use their arc length for army markers/formations; remove geographic layout toggle until another layout can transform the same path faithfully.
- Handle blocked legacy legs explicitly without teleporting; expose route errors to players. Test pathfinding and integration, full builds and inspect browser roads.

River crossings retain existing ford/bridge abstraction; this change does not add a naval system. Existing training process must not be killed or silently restarted.
