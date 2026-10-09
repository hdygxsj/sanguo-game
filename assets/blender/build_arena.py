from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import math
import re

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = PROJECT_ROOT / "assets" / "blender" / "arena-kit.blend"
GLB_PATH = PROJECT_ROOT / "apps" / "web" / "public" / "models" / "agent-arena" / "arena-kit.glb"

PALETTE = {
    "Cedar beams": (0.16, 0.045, 0.022, 1.0),
    "Glazed slate jade": (0.105, 0.125, 0.13, 1.0),
    "Ivory plaster": (0.55, 0.48, 0.36, 1.0),
    "Pine foliage": (0.025, 0.16, 0.075, 1.0),
    "Recessed doorways": (0.012, 0.022, 0.026, 1.0),
    "Roof tile edges": (0.19, 0.21, 0.205, 1.0),
    "Sunlit foliage": (0.20, 0.30, 0.12, 1.0),
    "Weathered limestone": (0.30, 0.34, 0.30, 1.0),
    "Dressed wall stone": (0.37, 0.39, 0.345, 1.0),
    "Imperial amber glaze": (0.38, 0.28, 0.13, 1.0),
    "Mountain moss": (0.20, 0.27, 0.13, 1.0),
    "Mountain slate": (0.12, 0.19, 0.24, 1.0),
}

MATERIAL_PROPERTIES = {
    "Cedar beams": {"roughness": 0.58},
    "Glazed slate jade": {"roughness": 0.78},
    "Ivory plaster": {"roughness": 0.86},
    "Pine foliage": {"roughness": 0.78},
    "Recessed doorways": {"roughness": 0.85},
    "Roof tile edges": {"roughness": 0.73},
    "Sunlit foliage": {"roughness": 0.72},
    "Weathered limestone": {"roughness": 0.92},
    "Dressed wall stone": {"roughness": 0.94},
    "Imperial amber glaze": {"roughness": 0.7},
    "Mountain moss": {"roughness": 0.94},
    "Mountain slate": {"roughness": 0.92},
}

PALETTE_MATS: dict[str, bpy.types.Material] = {}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def make_materials() -> dict[str, bpy.types.Material]:
    materials: dict[str, bpy.types.Material] = {}
    for name, color in PALETTE.items():
        material = bpy.data.materials.new(name)
        material.diffuse_color = color
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        properties = MATERIAL_PROPERTIES[name]
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Roughness"].default_value = properties.get("roughness", 0.65)
        shader.inputs["Metallic"].default_value = properties.get("metallic", 0.0)
        emission = properties.get("emission", 0.0)
        if "Emission Color" in shader.inputs:
            shader.inputs["Emission Color"].default_value = color
            shader.inputs["Emission Strength"].default_value = emission
        elif "Emission" in shader.inputs:
            shader.inputs["Emission"].default_value = color
            shader.inputs["Emission Strength"].default_value = emission
        materials[name] = material
    return materials


def root_object(name: str) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 0.14
    bpy.context.scene.collection.objects.link(root)
    return root


def attach(obj: bpy.types.Object, root: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    obj.parent = root
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def mesh_object(name, vertices, faces, material, root, location=(0.0, 0.0, 0.0)):
    mesh = bpy.data.meshes.new(f"{name}-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    return attach(obj, root, material)


def box(name, location, dimensions, material, root, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    attach(obj, root, material)
    if bevel > 0:
        modifier = obj.modifiers.new("crafted-edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    return obj


def cylinder(name, location, radius, depth, material, root, vertices=10, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return attach(obj, root, material)


def cone(name, location, radius1, radius2, depth, material, root, vertices=9, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return attach(obj, root, material)


def ico(name, location, scale, material, root, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return attach(obj, root, material)


def beam_between(name, start, end, width, material, root, bevel=0.0):
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) / 2
    obj = box(name, midpoint, (width, width, direction.length), material, root, bevel=bevel)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def stair_run(prefix, center, width, depth, rise, steps, material, root, facing=-1):
    x, y, z = center
    step_depth = depth / steps
    for index in range(steps):
        height = rise * (index + 1) / steps
        offset = (index + 0.5) * step_depth
        step_y = y + facing * (depth / 2 - offset)
        box(f"{prefix}-step-{index}", (x, step_y, z + height / 2), (width, step_depth + 0.018, height), material, root, bevel=0.008)


def lattice_window(prefix, center, width, height, material, inset_material, root):
    x, y, z = center
    thickness = 0.025
    depth = 0.035
    box(f"{prefix}-inset", (x, y, z), (width, depth, height), inset_material, root)
    for side in (-1, 1):
        box(f"{prefix}-frame-v-{side}", (x + side * width * 0.47, y - 0.006, z), (thickness, depth * 1.5, height), material, root)
        box(f"{prefix}-frame-h-{side}", (x, y - 0.006, z + side * height * 0.47), (width, depth * 1.5, thickness), material, root)
    for index, factor in enumerate((-0.25, 0.0, 0.25)):
        box(f"{prefix}-lattice-v-{index}", (x + width * factor, y - 0.01, z), (0.015, depth * 1.65, height * 0.88), material, root)
    box(f"{prefix}-lattice-h", (x, y - 0.01, z), (width * 0.9, depth * 1.65, 0.015), material, root)


def bracket_set(prefix, center, span, depth, material, root):
    x, y, z = center
    for index, scale in enumerate((1.0, 0.76, 0.52)):
        box(f"{prefix}-bracket-{index}", (x, y, z + index * 0.035), (span * scale, depth + index * 0.025, 0.035), material, root, bevel=0.006)


def banner(prefix, location, height, color_material, root, direction=1):
    x, y, z = location
    cylinder(f"{prefix}-pole", (x, y, z + height / 2), 0.022, height, PALETTE_MATS["Cedar beams"], root, 8)
    top = z + height * 0.82
    width = height * 0.32
    vertices = [
        (x, y, top),
        (x + direction * width, y, top - 0.035),
        (x + direction * width * 0.88, y, top - height * 0.31),
        (x + direction * width * 0.42, y, top - height * 0.27),
        (x, y, top - height * 0.34),
    ]
    mesh_object(f"{prefix}-cloth", vertices, [(0, 1, 2, 3, 4)], color_material, root)
    cylinder(f"{prefix}-finial", (x, y, z + height + 0.03), 0.042, 0.08, color_material, root, 6)


def roof_mesh(name, location, size, height, material, root):
    sx, sy = size
    segments = 8
    vertices, faces = [], []
    # Nested rectangular contours form a continuous swept hip, not a pyramid.
    for row in range(segments):
        t = row / segments
        half_x, half_y = sx * (0.5 - 0.23 * t), sy * 0.5 * (1 - t)
        roof_z = roof_profile(t) * height
        vertices.extend((cx * half_x, cy * half_y, roof_z)
                        for cx, cy in ((-1, -1), (1, -1), (1, 1), (-1, 1)))
        if row:
            for corner in range(4):
                a = (row - 1) * 4 + corner
                b = (row - 1) * 4 + (corner + 1) % 4
                faces.append((a, b, b + 4, a + 4))
    ridge = len(vertices)
    vertices.extend(((-sx * 0.27, 0, height), (sx * 0.27, 0, height)))
    last = (segments - 1) * 4
    faces.extend(((last, last + 1, ridge + 1, ridge),
                  (last + 1, last + 2, ridge + 1),
                  (last + 2, last + 3, ridge, ridge + 1),
                  (last + 3, last, ridge), (3, 2, 1, 0)))
    obj = mesh_object(name, vertices, faces, material, root, location)
    return obj


def roof_profile(t):
    return t ** 1.5 + 0.14 * (1 - t) ** 8


def curved_tile_rib(name, location, size, height, factor, side, material, root):
    sx, sy = size
    vertices, faces = [], []
    width = min(0.012, sx * 0.014)
    for row in range(9):
        t = row / 8
        x = factor * sx * (0.5 - 0.23 * t)
        y = side * sy * 0.5 * (1 - t)
        z = height * roof_profile(t) + 0.002
        vertices.extend(((x - width, y, z), (x, y, z + width), (x + width, y, z)))
        if row:
            for col in range(2):
                a = (row - 1) * 3 + col
                face = (a, a + 1, a + 4, a + 3)
                faces.append(face if side == -1 else tuple(reversed(face)))
    return mesh_object(name, vertices, faces, material, root, location)


def hip_roof(name, location, size, height, material, edge_material, root, ribs=7):
    x, y, z = location
    sx, sy = size
    roof_mesh(name, location, size, height, material, root)
    edge_height = z + height * 0.12
    box(f"{name}-eave-front", (x, y - sy / 2, edge_height), (sx + 0.12, 0.055, 0.055), edge_material, root, bevel=0.012)
    box(f"{name}-eave-back", (x, y + sy / 2, edge_height), (sx + 0.12, 0.055, 0.055), edge_material, root, bevel=0.012)
    box(f"{name}-eave-left", (x - sx / 2, y, edge_height), (0.055, sy + 0.12, 0.055), edge_material, root, bevel=0.012)
    box(f"{name}-eave-right", (x + sx / 2, y, edge_height), (0.055, sy + 0.12, 0.055), edge_material, root, bevel=0.012)
    beam_between(f"{name}-ridge", (x - sx * 0.3, y, z + height + 0.02), (x + sx * 0.3, y, z + height + 0.02), 0.045, edge_material, root, bevel=0.008)
    for index in range(ribs):
        factor = -1 + 2 * index / max(1, ribs - 1)
        for side in (-1, 1):
            curved_tile_rib(f"{name}-rib-{side}-{index}", location, size, height,
                            factor, side, edge_material, root)


def lantern(prefix, location, scale, root, glow_material=None):
    x, y, z = location
    glow = glow_material or PALETTE_MATS["Imperial amber glaze"]
    cylinder(f"{prefix}-post", (x, y, z + 0.34 * scale), 0.025 * scale, 0.68 * scale, PALETTE_MATS["Cedar beams"], root, 8)
    box(f"{prefix}-lamp", (x, y, z + 0.65 * scale), (0.18 * scale, 0.14 * scale, 0.20 * scale), glow, root, bevel=0.018 * scale)
    for side in (-1, 1):
        box(f"{prefix}-cage-v-{side}", (x + side * 0.075 * scale, y - 0.074 * scale, z + 0.65 * scale), (0.018 * scale, 0.02 * scale, 0.23 * scale), PALETTE_MATS["Cedar beams"], root)
    hip_roof(f"{prefix}-cap", (x, y, z + 0.78 * scale), (0.28 * scale, 0.24 * scale), 0.09 * scale, PALETTE_MATS["Glazed slate jade"], PALETTE_MATS["Roof tile edges"], root, ribs=3)


def jar(prefix, location, scale, root):
    x, y, z = location
    cone(f"{prefix}-body", (x, y, z + 0.13 * scale), 0.11 * scale, 0.075 * scale, 0.25 * scale, PALETTE_MATS["Weathered limestone"], root, 10)
    cylinder(f"{prefix}-lip", (x, y, z + 0.27 * scale), 0.083 * scale, 0.035 * scale, PALETTE_MATS["Roof tile edges"], root, 10)


def brazier(prefix, location, scale, root):
    x, y, z = location
    cylinder(f"{prefix}-stand", (x, y, z + 0.18 * scale), 0.035 * scale, 0.36 * scale, PALETTE_MATS["Cedar beams"], root, 8)
    cone(f"{prefix}-bowl", (x, y, z + 0.39 * scale), 0.15 * scale, 0.09 * scale, 0.12 * scale, PALETTE_MATS["Mountain slate"], root, 10)
    ico(f"{prefix}-ember", (x, y, z + 0.49 * scale), (0.075 * scale, 0.075 * scale, 0.13 * scale), PALETTE_MATS["Imperial amber glaze"], root, 1)


def well(prefix, location, scale, root):
    x, y, z = location
    bpy.ops.mesh.primitive_torus_add(major_radius=0.15 * scale, minor_radius=0.04 * scale, major_segments=12, minor_segments=5, location=(x, y, z + 0.12 * scale))
    ring = bpy.context.object
    ring.name = f"{prefix}-ring"
    attach(ring, root, PALETTE_MATS["Weathered limestone"])
    for side in (-1, 1):
        box(f"{prefix}-post-{side}", (x + side * 0.18 * scale, y, z + 0.34 * scale), (0.035 * scale, 0.035 * scale, 0.5 * scale), PALETTE_MATS["Cedar beams"], root)
    cylinder(f"{prefix}-spindle", (x, y, z + 0.43 * scale), 0.023 * scale, 0.42 * scale, PALETTE_MATS["Cedar beams"], root, 8, rotation=(0, math.pi / 2, 0))
    hip_roof(f"{prefix}-roof", (x, y, z + 0.58 * scale), (0.55 * scale, 0.42 * scale), 0.16 * scale, PALETTE_MATS["Glazed slate jade"], PALETTE_MATS["Roof tile edges"], root, ribs=4)


def fence(prefix, start, end, height, root):
    start_vector = Vector(start)
    end_vector = Vector(end)
    length = (end_vector - start_vector).length
    count = max(2, int(length / 0.28) + 1)
    for index in range(count):
        point = start_vector.lerp(end_vector, index / (count - 1))
        box(f"{prefix}-post-{index}", (point.x, point.y, point.z + height / 2), (0.035, 0.035, height), PALETTE_MATS["Cedar beams"], root)
    for level in (0.34, 0.68):
        beam_between(f"{prefix}-rail-{level}", start_vector + Vector((0, 0, height * level)), end_vector + Vector((0, 0, height * level)), 0.028, PALETTE_MATS["Cedar beams"], root)


def paver_field(prefix, center, width, depth, rows, columns, root, material=None):
    material = material or PALETTE_MATS["Weathered limestone"]
    x, y, z = center
    tile_w = width / columns
    tile_d = depth / rows
    for row in range(rows):
        for column in range(columns):
            stagger = tile_w * 0.12 if row % 2 else 0
            px = x - width / 2 + (column + 0.5) * tile_w + stagger
            py = y - depth / 2 + (row + 0.5) * tile_d
            box(f"{prefix}-{row}-{column}", (px, py, z + 0.014 + ((row + column) % 3) * 0.002), (tile_w * 0.84, tile_d * 0.80, 0.028), material, root, rotation=(0, 0, ((row * 3 + column) % 3 - 1) * 0.025))


def tree(prefix, location, scale, root, broadleaf=False):
    x, y, z = location
    trunk = PALETTE_MATS["Cedar beams"]
    dark = PALETTE_MATS["Pine foliage"]
    light = PALETTE_MATS["Sunlit foliage"]
    cone(f"{prefix}-trunk", (x, y, z + 0.32 * scale), 0.07 * scale, 0.045 * scale, 0.64 * scale, trunk, root, 8)
    if broadleaf:
        ico(f"{prefix}-crown-a", (x, y, z + 0.75 * scale), (0.32 * scale, 0.27 * scale, 0.30 * scale), dark, root, 2)
        ico(f"{prefix}-crown-b", (x + 0.16 * scale, y - 0.03 * scale, z + 0.88 * scale), (0.25 * scale, 0.22 * scale, 0.25 * scale), light, root, 1)
        ico(f"{prefix}-crown-c", (x - 0.18 * scale, y + 0.03 * scale, z + 0.82 * scale), (0.22 * scale, 0.20 * scale, 0.24 * scale), dark, root, 1)
    else:
        for index, (height_factor, radius_factor, material) in enumerate(((0.58, 0.28, dark), (0.78, 0.23, light), (0.96, 0.17, dark))):
            cone(f"{prefix}-tier-{index}", (x, y, z + height_factor * scale), radius_factor * scale, 0.015 * scale, 0.38 * scale, material, root, vertices=9)


def hall(prefix, center, width, depth, wall_height, root, roof_material="Glazed slate jade", stories=1, front=-1):
    x, y, z = center
    stone = PALETTE_MATS["Weathered limestone"]
    plaster = PALETTE_MATS["Ivory plaster"]
    wood = PALETTE_MATS["Cedar beams"]
    dark = PALETTE_MATS["Recessed doorways"]
    roof_mat = PALETTE_MATS[roof_material]
    edge = PALETTE_MATS["Roof tile edges"]
    box(f"{prefix}-plinth", (x, y, z + 0.07), (width + 0.24, depth + 0.24, 0.14), stone, root, bevel=0.028)
    current_z = z + 0.14
    for story in range(stories):
        level_width = width * (1 - story * 0.1)
        level_depth = depth * (1 - story * 0.1)
        box(f"{prefix}-walls-{story}", (x, y, current_z + wall_height / 2), (level_width, level_depth, wall_height), plaster, root, bevel=0.012)
        for cx in (-0.43, 0.43):
            for cy in (-0.43, 0.43):
                box(f"{prefix}-column-{story}-{cx}-{cy}", (x + cx * level_width, y + cy * level_depth, current_z + wall_height / 2), (0.055, 0.055, wall_height + 0.1), wood, root, bevel=0.008)
        door_y = y + front * (level_depth / 2 + 0.018)
        box(f"{prefix}-door-{story}", (x, door_y, current_z + wall_height * 0.34), (level_width * 0.2, 0.045, wall_height * 0.62), dark, root, bevel=0.006)
        for side in (-1, 1):
            lattice_window(f"{prefix}-window-{story}-{side}", (x + side * level_width * 0.28, door_y - front * 0.008, current_z + wall_height * 0.56), level_width * 0.18, wall_height * 0.36, wood, dark, root)
        bracket_set(f"{prefix}-bracket-front-{story}", (x, y + front * level_depth * 0.49, current_z + wall_height - 0.10), level_width * 0.92, 0.11, wood, root)
        bracket_set(f"{prefix}-bracket-back-{story}", (x, y - front * level_depth * 0.49, current_z + wall_height - 0.10), level_width * 0.92, 0.11, wood, root)
        hip_roof(f"{prefix}-roof-{story}", (x, y, current_z + wall_height), (level_width + 0.38, level_depth + 0.38), wall_height * 0.46, roof_mat, edge, root, ribs=max(5, int(level_width / 0.18)))
        current_z += wall_height * 1.27
    stair_run(f"{prefix}-stairs", (x, y + front * (depth / 2 + 0.18), z), width * 0.42, 0.36, 0.15, 4, stone, root, facing=front)


def watch_tower(prefix, location, root, scale=1.0, roof_material="Glazed slate jade", stories=1):
    x, y, z = location
    stone = PALETTE_MATS["Weathered limestone"]
    wood = PALETTE_MATS["Cedar beams"]
    plaster = PALETTE_MATS["Ivory plaster"]
    dark = PALETTE_MATS["Recessed doorways"]
    box(f"{prefix}-base", (x, y, z + 0.22 * scale), (0.48 * scale, 0.48 * scale, 0.44 * scale), stone, root, bevel=0.02)
    level_z = z + 0.44 * scale
    for story in range(stories):
        size = (0.42 - story * 0.04) * scale
        height = 0.28 * scale
        box(f"{prefix}-room-{story}", (x, y, level_z + height / 2), (size, size, height), plaster, root)
        for cx in (-1, 1):
            for cy in (-1, 1):
                box(f"{prefix}-post-{story}-{cx}-{cy}", (x + cx * size * 0.43, y + cy * size * 0.43, level_z + height / 2), (0.045, 0.045, height + 0.08), wood, root)
        box(f"{prefix}-slit-{story}", (x, y - size / 2 - 0.018, level_z + height * 0.58), (0.09 * scale, 0.04, 0.12 * scale), dark, root)
        hip_roof(f"{prefix}-roof-{story}", (x, y, level_z + height), (size + 0.25 * scale, size + 0.25 * scale), 0.18 * scale, PALETTE_MATS[roof_material], PALETTE_MATS["Roof tile edges"], root, ribs=5)
        level_z += height * 1.35


def masonry_courses(length, height, gap=0):
    blocks = []
    rows = max(3, round(height / 0.11))
    course = height / rows
    spans = [(-length / 2, length / 2)] if not gap else [(-length / 2, -gap / 2), (gap / 2, length / 2)]
    for row in range(rows):
        for left, right in spans:
            x = left - (0.14 if row % 2 else 0)
            while x < right:
                a, b = max(left, x), min(right, x + 0.28)
                if b - a > 0.014:
                    blocks.append(((a + b) / 2, (row + .5) * course, b - a - .008, course - .006))
                x += .28
    return blocks


def crenellated_wall(prefix, start, end, height, root, gate=False):
    stone = PALETTE_MATS["Weathered limestone"]
    dark = PALETTE_MATS["Recessed doorways"]
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    length = direction.length
    midpoint = (start_vector + end_vector) / 2
    rotation = -math.atan2(direction.x, direction.y)
    unit = direction.normalized()
    normal = Vector((-unit.y, unit.x, 0))
    gap = min(0.48, length * 0.28) if gate else 0
    if gate:
        gap = min(0.48, length * 0.28)
        unit = direction.normalized()
        segments = (("left", start_vector, midpoint - unit * gap / 2), ("right", midpoint + unit * gap / 2, end_vector))
        for suffix, segment_start, segment_end in segments:
            segment_mid = (segment_start + segment_end) / 2
            segment_length = (segment_end - segment_start).length
            obj = box(f"{prefix}-{suffix}", (segment_mid.x, segment_mid.y, height / 2), (0.14, segment_length, height), stone, root, bevel=0.015)
            obj.rotation_euler[2] = rotation
        box(f"{prefix}-gate-shadow", (midpoint.x, midpoint.y, height * 0.38), (gap, 0.09, height * 0.62), dark, root)
        box(f"{prefix}-gate-lintel", (midpoint.x, midpoint.y, height * 0.86), (gap + 0.18, 0.18, height * 0.22), stone, root, bevel=0.012)
    else:
        obj = box(f"{prefix}-body", (midpoint.x, midpoint.y, height / 2), (0.14, length, height), stone, root, bevel=0.015)
        obj.rotation_euler[2] = rotation
    for index, (along, z, width, course_height) in enumerate(masonry_courses(length, height, gap)):
        for side in (-1, 1):
            center = midpoint + unit * along + normal * (.073 * side)
            obj = box(f"{prefix}-ashlar-{index}-{side}", (center.x, center.y, z),
                      (.008, width, course_height), PALETTE_MATS['Dressed wall stone'], root)
            obj.rotation_euler[2] = rotation
    for side, a, b in (("left", -length / 2, -gap / 2), ("right", gap / 2, length / 2)) if gate else (("full", -length / 2, length / 2),):
        center = midpoint + unit * ((a + b) / 2)
        obj = box(f"{prefix}-coping-{side}", (center.x, center.y, height), (.17, b - a, .025), stone, root, bevel=.004)
        obj.rotation_euler[2] = rotation
    count = max(3, int(length / 0.22))
    for index in range(count + 1):
        point = start_vector.lerp(end_vector, index / count)
        if gate and (point - midpoint).length < 0.33:
            continue
        box(f"{prefix}-merlon-{index}", (point.x, point.y, height + 0.055), (0.12, 0.13, 0.11), stone, root, bevel=0.008)


def fortified_perimeter(prefix, half_x, half_y, height, root, roof_material, tower_scale=0.8, inner=False):
    crenellated_wall(f"{prefix}-north", (-half_x, half_y, 0), (half_x, half_y, 0), height, root)
    crenellated_wall(f"{prefix}-south", (-half_x, -half_y, 0), (half_x, -half_y, 0), height, root, gate=True)
    crenellated_wall(f"{prefix}-east", (half_x, -half_y, 0), (half_x, half_y, 0), height, root)
    crenellated_wall(f"{prefix}-west", (-half_x, -half_y, 0), (-half_x, half_y, 0), height, root)
    if not inner:
        for index, (x, y) in enumerate(((-half_x, -half_y), (half_x, -half_y), (-half_x, half_y), (half_x, half_y))):
            watch_tower(f"{prefix}-tower-{index}", (x, y, 0), root, tower_scale, roof_material)


def build_village_a(root):
    stone = PALETTE_MATS["Weathered limestone"]
    box("village-a-ground", (0, 0, 0.035), (2.25, 1.75, 0.07), stone, root, bevel=0.08)
    paver_field("village-a-path", (0.05, -0.25, 0.07), 0.55, 1.15, 5, 2, root)
    hall("village-a-main", (-0.28, 0.27, 0.07), 0.92, 0.62, 0.43, root)
    hall("village-a-home", (0.52, 0.32, 0.07), 0.58, 0.45, 0.34, root)
    hall("village-a-gate", (0.03, -0.62, 0.07), 0.54, 0.30, 0.30, root)
    well("village-a-well", (0.62, -0.28, 0.07), 0.7, root)
    fence("village-a-fence-west", (-1.0, -0.6, 0.07), (-1.0, 0.65, 0.07), 0.28, root)
    fence("village-a-fence-north", (-1.0, 0.65, 0.07), (-0.55, 0.65, 0.07), 0.28, root)
    tree("village-a-pine", (-0.82, 0.28, 0.07), 0.74, root)
    tree("village-a-tree", (0.9, 0.22, 0.07), 0.6, root, broadleaf=True)
    lantern("village-a-lantern", (-0.33, -0.48, 0.07), 0.55, root)


def build_village_b(root):
    stone = PALETTE_MATS["Weathered limestone"]
    box("village-b-ground", (0, 0, 0.04), (2.45, 1.95, 0.08), stone, root, bevel=0.09)
    paver_field("village-b-market", (0.08, -0.18, 0.085), 1.25, 0.72, 3, 5, root)
    hall("village-b-main", (-0.45, 0.38, 0.08), 0.84, 0.60, 0.42, root)
    hall("village-b-east", (0.56, 0.45, 0.08), 0.62, 0.46, 0.34, root)
    hall("village-b-south", (-0.62, -0.50, 0.08), 0.58, 0.42, 0.32, root)
    watch_tower("village-b-watch", (0.93, -0.48, 0.08), root, 0.58)
    for index, x in enumerate((-0.15, 0.22, 0.58)):
        box(f"village-b-stall-{index}-counter", (x, -0.39, 0.21), (0.26, 0.18, 0.12), PALETTE_MATS["Cedar beams"], root, bevel=0.012)
        roof_material = PALETTE_MATS["Imperial amber glaze"] if index == 1 else PALETTE_MATS["Glazed slate jade"]
        hip_roof(f"village-b-stall-{index}-awning", (x, -0.39, 0.34), (0.34, 0.28), 0.1, roof_material, PALETTE_MATS["Roof tile edges"], root, ribs=3)
    jar("village-b-jar-a", (0.42, -0.66, 0.08), 0.62, root)
    jar("village-b-jar-b", (0.64, -0.68, 0.08), 0.52, root)
    lantern("village-b-lantern-a", (-0.05, -0.68, 0.08), 0.55, root)
    lantern("village-b-lantern-b", (0.76, -0.14, 0.08), 0.5, root)
    tree("village-b-tree", (-1.0, 0.2, 0.08), 0.68, root, broadleaf=True)


def build_fort(root, name, level, imperial=False):
    roof_name = "Imperial amber glaze" if imperial else "Glazed slate jade"
    stone = PALETTE_MATS["Weathered limestone"]
    scale = 1 + (level - 1) * 0.16
    half_x = 1.12 * scale
    half_y = 0.82 * scale
    box(f"{name}-ground", (0, 0, 0.04), (half_x * 2 + 0.2, half_y * 2 + 0.2, 0.08), stone, root, bevel=0.09)
    paver_field(f"{name}-court", (0, -0.1, 0.085), half_x * 1.5, half_y * 1.3, 5 + level, 6 + level, root)
    fortified_perimeter(f"{name}-outer", half_x, half_y, 0.31 + level * 0.025, root, roof_name, 0.72 + level * 0.05)
    hall(f"{name}-main", (0, 0.26, 0.08), 0.9 + level * 0.12, 0.56 + level * 0.06, 0.38 + level * 0.045, root, roof_name, stories=1 if level < 3 else 2)
    hall(f"{name}-barracks-west", (-half_x * 0.57, -0.22, 0.08), 0.52 + level * 0.04, 0.35, 0.28 + level * 0.018, root, roof_name)
    if level >= 2:
        hall(f"{name}-barracks-east", (half_x * 0.57, -0.18, 0.08), 0.52 + level * 0.04, 0.35, 0.28 + level * 0.018, root, roof_name)
        box(f"{name}-terrace", (0, 0.36, 0.15), (1.25 + level * 0.16, 0.88, 0.16), stone, root, bevel=0.025)
        stair_run(f"{name}-ceremonial-stairs", (0, -0.22, 0.08), 0.54, 0.45, 0.24, 6, stone, root, facing=-1)
    if level >= 3:
        fortified_perimeter(f"{name}-inner", half_x * 0.6, half_y * 0.5, 0.22, root, roof_name, inner=True)
        watch_tower(f"{name}-keep", (0, 0.36, 0.22), root, 0.86 + level * 0.05, roof_name)
        brazier(f"{name}-beacon-west", (-half_x * 0.74, 0.1, 0.08), 0.72, root)
        brazier(f"{name}-beacon-east", (half_x * 0.74, 0.1, 0.08), 0.72, root)
    if level >= 4:
        hall(f"{name}-throne", (0, 0.52, 0.30), 1.24, 0.72, 0.48, root, roof_name, stories=2)
        hall(f"{name}-pavilion-west", (-1.12, 0.34, 0.08), 0.55, 0.42, 0.34, root, roof_name)
        hall(f"{name}-pavilion-east", (1.12, 0.34, 0.08), 0.55, 0.42, 0.34, root, roof_name)
        stair_run(f"{name}-grand-stairs", (0, -0.3, 0.08), 0.72, 0.62, 0.34, 8, stone, root, facing=-1)
        for index, x in enumerate((-0.78, -0.34, 0.34, 0.78)):
            banner(f"{name}-imperial-banner-{index}", (x, -0.52, 0.08), 0.8, PALETTE_MATS["Imperial amber glaze"], root, 1 if x < 0 else -1)
    else:
        banner(f"{name}-banner-west", (-half_x * 0.62, -0.45, 0.08), 0.65 + level * 0.06, PALETTE_MATS["Glazed slate jade"], root)
        banner(f"{name}-banner-east", (half_x * 0.62, -0.45, 0.08), 0.65 + level * 0.06, PALETTE_MATS["Glazed slate jade"], root, -1)


def rock_spire(prefix, location, radius, height, root, rotation=0.0):
    x, y, z = location
    slate = PALETTE_MATS["Mountain slate"]
    moss = PALETTE_MATS["Mountain moss"]
    cone(f"{prefix}-base", (x, y, z + height * 0.33), radius, radius * 0.64, height * 0.66, slate, root, vertices=7, rotation=(0.05, -0.08, rotation))
    cone(f"{prefix}-peak", (x - radius * 0.08, y + radius * 0.05, z + height * 0.78), radius * 0.66, radius * 0.08, height * 0.58, slate, root, vertices=7, rotation=(-0.06, 0.07, -rotation))
    box(f"{prefix}-moss-shelf", (x - radius * 0.12, y - radius * 0.18, z + height * 0.54), (radius * 1.0, radius * 0.55, 0.08), moss, root, rotation=(0.05, 0.0, rotation), bevel=0.018)


def build_mountain(root):
    stone = PALETTE_MATS["Mountain slate"]
    box("mountain-ground", (0, 0, 0.04), (2.8, 2.1, 0.08), stone, root, bevel=0.12)
    rock_spire("mountain-main", (0.0, 0.18, 0.08), 0.62, 1.65, root, 0.1)
    rock_spire("mountain-west", (-0.78, 0.08, 0.08), 0.46, 1.16, root, -0.22)
    rock_spire("mountain-east", (0.78, 0.15, 0.08), 0.42, 1.0, root, 0.18)
    rock_spire("mountain-front", (0.1, -0.58, 0.08), 0.38, 0.82, root, -0.12)
    for index, (start, end) in enumerate((((-1.0, -0.68, 0.24), (-0.42, -0.62, 0.32)), ((0.38, -0.72, 0.25), (1.0, -0.58, 0.34)))):
        beam_between(f"mountain-arch-{index}", start, end, 0.16, stone, root, bevel=0.025)
    tree("mountain-pine-west", (-0.86, 0.48, 0.08), 0.54, root)
    tree("mountain-pine-east", (0.78, -0.22, 0.08), 0.46, root)
    tree("mountain-pine-high", (-0.18, 0.18, 0.94), 0.34, root)
    for index, x in enumerate((-0.55, -0.32, 0.35, 0.58)):
        ico(f"mountain-ground-moss-{index}", (x, -0.82 + (index % 2) * 0.12, 0.12), (0.22, 0.18, 0.08), PALETTE_MATS["Mountain moss"], root, 1)


def build_grove(root):
    stone = PALETTE_MATS["Weathered limestone"]
    moss = PALETTE_MATS["Mountain moss"]
    box("grove-ground", (0, 0, 0.035), (2.45, 1.9, 0.07), moss, root, bevel=0.14)
    tree("grove-pine-tall", (-0.48, 0.28, 0.07), 0.92, root)
    tree("grove-pine-small", (0.42, 0.48, 0.07), 0.68, root)
    tree("grove-oak-main", (0.14, -0.12, 0.07), 0.82, root, broadleaf=True)
    tree("grove-oak-west", (-0.84, -0.26, 0.07), 0.60, root, broadleaf=True)
    tree("grove-pine-east", (0.82, -0.28, 0.07), 0.56, root)
    for index, (x, y, scale) in enumerate(((-0.2, -0.72, 0.8), (0.38, -0.65, 0.58), (0.74, 0.05, 0.62))):
        ico(f"grove-rock-{index}", (x, y, 0.13 * scale), (0.2 * scale, 0.16 * scale, 0.13 * scale), stone, root, 1)
    for index, (x, y) in enumerate(((-0.58, -0.52), (-0.36, -0.6), (0.52, 0.1), (0.64, 0.2), (-0.15, 0.62))):
        cone(f"grove-shrub-{index}", (x, y, 0.14), 0.13, 0.025, 0.28, PALETTE_MATS["Sunlit foliage"], root, 7)
    lantern("grove-shrine-lantern", (0.48, -0.52, 0.07), 0.48, root)
    paver_field("grove-shrine-path", (0.2, -0.63, 0.075), 0.85, 0.28, 1, 5, root, stone)


def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            pass
    obj.select_set(False)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def consolidate_root_by_material(root: bpy.types.Object) -> None:
    groups: dict[str, list[bpy.types.Object]] = defaultdict(list)
    for child in list(root.children):
        if child.type != "MESH":
            continue
        apply_modifiers(child)
        material = child.data.materials[0] if child.data.materials else None
        if material:
            groups[material.name].append(child)
    for material_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        if len(objects) > 1:
            bpy.ops.object.join()
        active.name = f"{root.name}--{slug(material_name)}"
        active.parent = root
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        active.select_set(False)


def remove_unused_data() -> None:
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def main() -> None:
    global PALETTE_MATS
    clear_scene()
    PALETTE_MATS = make_materials()
    roots = {name: root_object(name) for name in ("village-a", "village-b", "fort", "citadel", "stronghold", "imperial", "mountain", "grove")}
    builders = {
        "village-a": build_village_a,
        "village-b": build_village_b,
        "fort": lambda root: build_fort(root, "fort", 1),
        "citadel": lambda root: build_fort(root, "citadel", 2),
        "stronghold": lambda root: build_fort(root, "stronghold", 3),
        "imperial": lambda root: build_fort(root, "imperial", 4, imperial=True),
        "mountain": build_mountain,
        "grove": build_grove,
    }
    # Batch each asset immediately: avoid thousands of objects slowing every
    # subsequent Blender operator through dependency-graph updates.
    for name, root in roots.items():
        builders[name](root)
        consolidate_root_by_material(root)
        print(f"ARENA_ASSET_READY {name}", flush=True)
    remove_unused_data()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.world.color = (0.003, 0.008, 0.014)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
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
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=10,
        export_draco_generic_quantization=12,
    )
    print(f"ARENA_BUILD_OK blend={BLEND_PATH} glb={GLB_PATH}")


if __name__ == "__main__":
    main()
