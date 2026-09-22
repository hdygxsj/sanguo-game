import bpy
import sys

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

mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
if len(mesh_objects) < 48:
    fail(f"expected at least 48 meshes, found {len(mesh_objects)}")

for obj in mesh_objects:
    if any(abs(scale - 1.0) > 0.0001 for scale in obj.scale):
        fail(f"unapplied scale on {obj.name}")

print(
    "ARENA_VERIFY_OK",
    {"roots": len(REQUIRED_ROOTS), "materials": len(REQUIRED_MATERIALS), "meshes": len(mesh_objects)},
)
