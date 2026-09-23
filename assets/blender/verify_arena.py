import bpy
import sys
from mathutils import Vector

REQUIRED_ROOTS = {
    "village-a",
    "village-b",
    "fort",
    "citadel",
    "stronghold",
    "imperial",
    "mountain",
    "grove",
}

REQUIRED_MATERIALS = {
    "Cedar beams",
    "Glazed slate jade",
    "Ivory plaster",
    "Pine foliage",
    "Recessed doorways",
    "Roof tile edges",
    "Sunlit foliage",
    "Weathered limestone",
    "Imperial amber glaze",
    "Mountain moss",
    "Mountain slate",
}

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

ARCHITECTURAL_ROOTS = {"village-a", "village-b", "fort", "citadel", "stronghold", "imperial"}


def fail(message: str) -> None:
    print(f"ARENA_VERIFY_ERROR: {message}")
    sys.exit(1)


missing_roots = REQUIRED_ROOTS.difference(bpy.data.objects.keys())
if missing_roots:
    fail(f"missing roots: {sorted(missing_roots)}")

missing_materials = REQUIRED_MATERIALS.difference(bpy.data.materials.keys())
if missing_materials:
    fail(f"missing materials: {sorted(missing_materials)}")

for root_name in REQUIRED_ROOTS:
    root = bpy.data.objects[root_name]
    if not root.children:
        fail(f"{root_name} has no children")
    if abs(root.location.z) > 0.0001:
        fail(f"{root_name} origin must be on ground")

    mesh_children = [child for child in root.children if child.type == "MESH"]
    if not 2 <= len(mesh_children) <= 11:
        fail(f"{root_name} must be batched to 2-11 mesh children, found {len(mesh_children)}")

    triangles = 0
    material_names = set()
    world_corners = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for child in mesh_children:
        evaluated = child.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        triangles += sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons)
        evaluated.to_mesh_clear()
        material_names.update(slot.material.name for slot in child.material_slots if slot.material)
        world_corners.extend(child.matrix_world @ Vector(corner) for corner in child.bound_box)

    if triangles < MIN_TRIANGLES[root_name]:
        fail(f"{root_name} needs {MIN_TRIANGLES[root_name]} triangles, found {triangles}")
    required_material_count = 5 if root_name in ARCHITECTURAL_ROOTS else 3
    if len(material_names) < required_material_count:
        fail(f"{root_name} needs {required_material_count} materials, found {len(material_names)}")

    minimum = Vector((min(point.x for point in world_corners), min(point.y for point in world_corners), min(point.z for point in world_corners)))
    maximum = Vector((max(point.x for point in world_corners), max(point.y for point in world_corners), max(point.z for point in world_corners)))
    dimensions = maximum - minimum
    if minimum.z < -0.03:
        fail(f"{root_name} geometry extends below ground: {minimum.z:.3f}")
    if min(dimensions.x, dimensions.y, dimensions.z) <= 0.1 or max(dimensions) > 8.0:
        fail(f"{root_name} has invalid bounds: {tuple(round(value, 3) for value in dimensions)}")

mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
if not 16 <= len(mesh_objects) <= 88:
    fail(f"expected 16-88 batched meshes, found {len(mesh_objects)}")

for obj in mesh_objects:
    if any(abs(scale - 1.0) > 0.0001 for scale in obj.scale):
        fail(f"unapplied scale on {obj.name}")

total_triangles = sum(
    max(0, len(polygon.vertices) - 2)
    for obj in mesh_objects
    for polygon in obj.data.polygons
)
if not 25000 <= total_triangles <= 120000:
    fail(f"expected 25000-120000 total triangles, found {total_triangles}")

print(
    "ARENA_VERIFY_OK",
    {
        "roots": len(REQUIRED_ROOTS),
        "materials": len(REQUIRED_MATERIALS),
        "meshes": len(mesh_objects),
        "triangles": total_triangles,
    },
)
