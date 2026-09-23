from pathlib import Path

import bpy
import mathutils


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "assets" / "blender" / "arena-kit.blend"
OUTPUT_PATH = ROOT / "apps" / "web" / "public" / "images" / "arena-fallback.png"


def point_camera(camera, target=(0, 0, 0)):
    direction = mathutils.Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def material(name, color, roughness=0.75, metallic=0.0):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return value


bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))
placements = {
    "imperial": ((0.0, 0.65, 0.24), 0.86),
    "stronghold": ((-4.2, 1.8, 0.14), 0.9),
    "citadel": ((4.0, 1.75, 0.14), 0.94),
    "fort": ((-4.1, -2.35, 0.12), 1.0),
    "village-a": ((3.8, -2.45, 0.12), 1.08),
    "village-b": ((0.2, -3.5, 0.12), 1.02),
    "mountain": ((-6.5, 0.15, 0.1), 1.0),
    "grove": ((6.45, -0.25, 0.1), 1.02),
}
for name, (position, scale) in placements.items():
    root = bpy.data.objects.get(name)
    if root:
        root.location = position
        root.scale = (scale, scale, scale)
bpy.ops.mesh.primitive_cube_add(location=(0, 0, -0.18), scale=(8.9, 6.3, 0.18))
ground = bpy.context.object
ground.name = "preview-diorama-ground"
ground.data.materials.append(material("preview-ground-material", (0.008, 0.025, 0.026, 1), 0.9, 0.04))
bevel = ground.modifiers.new("ground-bevel", "BEVEL")
bevel.width = 0.24
bevel.segments = 4
bpy.ops.mesh.primitive_cube_add(location=(0, 0, -0.38), scale=(9.2, 6.6, 0.12))
base = bpy.context.object
base.data.materials.append(material("preview-base-material", (0.008, 0.011, 0.02, 1), 0.72, 0.18))
base_bevel = base.modifiers.new("base-bevel", "BEVEL")
base_bevel.width = 0.18
base_bevel.segments = 3
bpy.ops.object.camera_add(location=(12.8, -16.8, 12.6))
camera = bpy.context.object
point_camera(camera, (0, -0.15, 0.45))
camera.data.type = "ORTHO"
camera.data.ortho_scale = 16.5
bpy.context.scene.camera = camera
for location, energy, size, color in (
    ((2.5, -4.0, 13.5), 2100, 8.0, (1.0, 0.66, 0.36)),
    ((-8.0, 2.5, 8.0), 1550, 7.0, (0.25, 0.43, 1.0)),
    ((7.0, 6.0, 7.0), 850, 6.0, (0.28, 0.92, 0.78)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.filepath = str(OUTPUT_PATH)
scene.world.color = (0.002, 0.003, 0.009)
scene.view_settings.look = "AgX - Medium High Contrast"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
print(f"ARENA_PREVIEW_OK {OUTPUT_PATH}")
