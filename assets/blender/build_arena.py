from pathlib import Path
import math

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = PROJECT_ROOT / "assets" / "blender" / "arena-kit.blend"
GLB_PATH = PROJECT_ROOT / "apps" / "web" / "public" / "models" / "agent-arena" / "arena-kit.glb"

PALETTE = {
    "Cedar beams": (0.14996, 0.05613, 0.03071, 1.0),
    "Glazed slate jade": (0.03955, 0.10702, 0.11954, 1.0),
    "Ivory plaster": (0.69387, 0.58408, 0.37626, 1.0),
    "Pine foliage": (0.08438, 0.18116, 0.10224, 1.0),
    "Recessed doorways": (0.02029, 0.03560, 0.03689, 1.0),
    "Roof tile edges": (0.09306, 0.18782, 0.19807, 1.0),
    "Sunlit foliage": (0.20864, 0.31399, 0.13843, 1.0),
    "Weathered limestone": (0.23840, 0.26225, 0.23455, 1.0),
    "Imperial amber glaze": (0.59720, 0.38133, 0.09084, 1.0),
    "Mountain moss": (0.24620, 0.31399, 0.19120, 1.0),
    "Mountain slate": (0.13287, 0.18447, 0.19807, 1.0),
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        if datablocks is bpy.data.materials:
            continue
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_materials() -> dict[str, bpy.types.Material]:
    materials = {}
    for name, color in PALETTE.items():
        material = bpy.data.materials.new(name)
        material.diffuse_color = color
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Roughness"].default_value = 0.72 if "glaze" not in name.lower() else 0.42
        shader.inputs["Metallic"].default_value = 0.08 if "slate" in name.lower() else 0.0
        materials[name] = material
    return materials


def root_object(name: str) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 0.18
    bpy.context.scene.collection.objects.link(root)
    return root


def attach(obj: bpy.types.Object, root: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    obj.parent = root
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def cube(name, location, dimensions, material, root, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    attach(obj, root, material)
    if bevel > 0:
        modifier = obj.modifiers.new("softened-stone", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    return obj


def cylinder(name, location, radius, depth, material, root, vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    return attach(obj, root, material)


def ico(name, location, scale, material, root, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return attach(obj, root, material)


def hip_roof(name, location, size, height, material, edge_material, root):
    sx, sy = size
    vertices = [
        (-sx / 2, -sy / 2, 0),
        (sx / 2, -sy / 2, 0),
        (sx / 2, sy / 2, 0),
        (-sx / 2, sy / 2, 0),
        (-sx * 0.28, 0, height),
        (sx * 0.28, 0, height),
    ]
    faces = [(0, 1, 5, 4), (1, 2, 5), (2, 3, 4, 5), (3, 0, 4), (0, 3, 2, 1)]
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    attach(obj, root, material)
    cube(f"{name}-eave", (location[0], location[1], location[2] - 0.025), (sx + 0.14, sy + 0.14, 0.055), edge_material, root, bevel=0.018)
    cylinder(f"{name}-ridge", (location[0], location[1], location[2] + height), 0.035, sx * 0.62, edge_material, root, vertices=6).rotation_euler[1] = math.pi / 2
    return obj


def tree(name, location, scale, root, mats):
    x, y, z = location
    cylinder(f"{name}-trunk", (x, y, z + 0.28 * scale), 0.055 * scale, 0.56 * scale, mats["Cedar beams"], root, 7)
    ico(f"{name}-pine", (x, y, z + 0.67 * scale), (0.28 * scale, 0.28 * scale, 0.43 * scale), mats["Pine foliage"], root)
    ico(f"{name}-sunlit", (x + 0.08 * scale, y - 0.03 * scale, z + 0.78 * scale), (0.16 * scale, 0.16 * scale, 0.22 * scale), mats["Sunlit foliage"], root)


def hall(prefix, center, width, depth, wall_height, root, mats, roof_material="Glazed slate jade", door_side=1):
    x, y, z = center
    cube(f"{prefix}-plinth", (x, y, z + 0.07), (width + 0.18, depth + 0.18, 0.14), mats["Weathered limestone"], root, bevel=0.025)
    cube(f"{prefix}-walls", (x, y, z + 0.14 + wall_height / 2), (width, depth, wall_height), mats["Ivory plaster"], root)
    door_y = y - depth / 2 - 0.012 if door_side > 0 else y + depth / 2 + 0.012
    cube(f"{prefix}-door", (x, door_y, z + 0.14 + wall_height * 0.32), (width * 0.22, 0.035, wall_height * 0.58), mats["Recessed doorways"], root)
    for side in (-1, 1):
        cube(f"{prefix}-beam-x-{side}", (x + side * width * 0.43, y, z + 0.14 + wall_height / 2), (0.055, depth + 0.08, wall_height + 0.08), mats["Cedar beams"], root)
    for side in (-1, 1):
        cube(f"{prefix}-beam-y-{side}", (x, y + side * depth * 0.43, z + 0.14 + wall_height * 0.84), (width + 0.08, 0.055, 0.07), mats["Cedar beams"], root)
    hip_roof(f"{prefix}-roof", (x, y, z + 0.14 + wall_height), (width + 0.34, depth + 0.38), wall_height * 0.42, mats[roof_material], mats["Roof tile edges"], root)


def tower(prefix, location, root, mats, roof_material="Glazed slate jade", scale=1.0):
    x, y, z = location
    cube(f"{prefix}-base", (x, y, z + 0.22 * scale), (0.48 * scale, 0.48 * scale, 0.44 * scale), mats["Weathered limestone"], root, bevel=0.015)
    cube(f"{prefix}-upper", (x, y, z + 0.55 * scale), (0.38 * scale, 0.38 * scale, 0.26 * scale), mats["Ivory plaster"], root)
    hip_roof(f"{prefix}-roof", (x, y, z + 0.68 * scale), (0.62 * scale, 0.62 * scale), 0.22 * scale, mats[roof_material], mats["Roof tile edges"], root)


def perimeter(prefix, half_x, half_y, height, root, mats, towers=True, roof_material="Glazed slate jade"):
    cube(f"{prefix}-wall-n", (0, half_y, height / 2), (half_x * 2, 0.13, height), mats["Weathered limestone"], root)
    cube(f"{prefix}-wall-s", (0, -half_y, height / 2), (half_x * 2, 0.13, height), mats["Weathered limestone"], root)
    cube(f"{prefix}-wall-e", (half_x, 0, height / 2), (0.13, half_y * 2, height), mats["Weathered limestone"], root)
    cube(f"{prefix}-wall-w", (-half_x, 0, height / 2), (0.13, half_y * 2, height), mats["Weathered limestone"], root)
    cube(f"{prefix}-gate", (0, -half_y - 0.015, height * 0.42), (0.42, 0.16, height * 0.58), mats["Recessed doorways"], root)
    if towers:
        for index, (x, y) in enumerate(((-half_x, -half_y), (half_x, -half_y), (-half_x, half_y), (half_x, half_y))):
            tower(f"{prefix}-tower-{index}", (x, y, 0), root, mats, roof_material, 0.72)


def build_village(name, variant, mats):
    root = root_object(name)
    offset = -0.16 if variant == "a" else 0.14
    hall(f"{name}-main", (offset, 0.03, 0), 0.92, 0.62, 0.42, root, mats)
    hall(f"{name}-side", (-offset * 2.0, 0.2, 0), 0.48, 0.38, 0.3, root, mats)
    tree(f"{name}-tree", (0.64 if variant == "a" else -0.62, 0.12, 0), 0.66, root, mats)
    return root


def build_fort(name, level, mats, imperial=False):
    root = root_object(name)
    roof_material = "Imperial amber glaze" if imperial else "Glazed slate jade"
    size_x = 0.88 + level * 0.13
    size_y = 0.58 + level * 0.1
    perimeter(f"{name}-outer", size_x, size_y, 0.26 + level * 0.025, root, mats, True, roof_material)
    hall(f"{name}-hall", (0, 0.12, 0), 0.72 + level * 0.1, 0.48 + level * 0.06, 0.34 + level * 0.04, root, mats, roof_material)
    if level >= 2:
        hall(f"{name}-rear", (0, 0.52, 0), 0.58 + level * 0.06, 0.34, 0.3 + level * 0.025, root, mats, roof_material, -1)
    if level >= 3:
        perimeter(f"{name}-inner", size_x * 0.55, size_y * 0.55, 0.18, root, mats, False, roof_material)
    if level >= 4:
        tower(f"{name}-keep", (0, 0.12, 0.12), root, mats, roof_material, 1.18)
    return root


def build_mountain(mats):
    root = root_object("mountain")
    rocks = [(-0.48, 0.08, 0.28, 0.52), (0.0, 0.03, 0.42, 0.7), (0.5, 0.12, 0.3, 0.48), (-0.18, -0.34, 0.24, 0.42), (0.35, -0.3, 0.22, 0.38)]
    for index, (x, y, z, scale) in enumerate(rocks):
        ico(f"mountain-rock-{index}", (x, y, z), (scale, scale * 0.72, scale * 1.25), mats["Mountain slate"], root, 1)
        if index < 3:
            ico(f"mountain-moss-{index}", (x - 0.05, y - 0.06, z + scale * 0.62), (scale * 0.42, scale * 0.32, scale * 0.18), mats["Mountain moss"], root, 1)
    tree("mountain-pine", (-0.7, 0.25, 0), 0.52, root, mats)
    return root


def build_grove(mats):
    root = root_object("grove")
    for index, (x, y, scale) in enumerate(((-0.25, 0.02, 0.78), (0.18, 0.12, 0.92), (0.0, -0.22, 0.66))):
        tree(f"grove-tree-{index}", (x, y, 0), scale, root, mats)
    return root


def main() -> None:
    clear_scene()
    materials = make_materials()
    build_village("village-a", "a", materials)
    build_village("village-b", "b", materials)
    build_fort("fort", 1, materials)
    build_fort("citadel", 2, materials)
    build_fort("stronghold", 3, materials)
    build_fort("imperial", 4, materials, imperial=True)
    build_mountain(materials)
    build_grove(materials)

    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.world.color = (0.008, 0.012, 0.025)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_visible=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"ARENA_BUILD_OK blend={BLEND_PATH} glb={GLB_PATH}")


if __name__ == "__main__":
    main()
