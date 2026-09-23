from pathlib import Path

import bpy
import mathutils


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "assets" / "blender" / "arena-kit.blend"
OUTPUT_PATH = ROOT / "qa-evidence" / "arena-model-catalog.png"


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
    "village-a": (-5.4, 2.5, 1.06),
    "village-b": (-1.8, 2.5, 0.96),
    "fort": (1.8, 2.5, 0.92),
    "citadel": (5.4, 2.5, 0.82),
    "stronghold": (-5.4, -2.25, 0.74),
    "imperial": (-1.8, -2.25, 0.62),
    "mountain": (1.8, -2.25, 0.92),
    "grove": (5.4, -2.25, 0.98),
}
pedestal_material = material("catalog-pedestal", (0.025, 0.045, 0.052, 1), 0.82, 0.08)
rim_material = material("catalog-rim", (0.06, 0.23, 0.25, 1), 0.36, 0.22)
label_material = material("catalog-label", (0.56, 0.76, 0.80, 1), 0.5)
for name, (x, y, scale) in placements.items():
    root = bpy.data.objects.get(name)
    if root:
        root.location = (x, y, 0.18)
        root.scale = (scale, scale, scale)
    bpy.ops.mesh.primitive_cube_add(location=(x, y, 0.04), scale=(1.55, 1.48, 0.08))
    pedestal = bpy.context.object
    pedestal.name = f"catalog-{name}-pedestal"
    pedestal.data.materials.append(pedestal_material)
    bevel = pedestal.modifiers.new("pedestal-bevel", "BEVEL")
    bevel.width = 0.09
    bevel.segments = 3
    bpy.ops.mesh.primitive_torus_add(major_radius=1.43, minor_radius=0.018, major_segments=64, minor_segments=4, location=(x, y, 0.14))
    bpy.context.object.data.materials.append(rim_material)
    bpy.ops.object.text_add(location=(x - 0.72, y - 1.28, 0.15))
    label = bpy.context.object
    label.data.body = name.upper()
    label.data.align_x = "LEFT"
    label.data.size = 0.28
    label.data.extrude = 0.008
    label.data.materials.append(label_material)
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.06))
bpy.context.object.data.materials.append(material("catalog-ground", (0.004, 0.008, 0.014, 1), 0.94))
bpy.ops.object.camera_add(location=(11.5, -15.5, 14.5))
camera = bpy.context.object
point_camera(camera, (0, 0, 0.4))
camera.data.type = "ORTHO"
camera.data.ortho_scale = 17.2
bpy.context.scene.camera = camera
for location, energy, size, color in (
    ((-5.0, -6.0, 14.0), 1850, 8.0, (1.0, 0.67, 0.40)),
    ((8.0, 2.0, 10.0), 1350, 7.0, (0.28, 0.48, 1.0)),
    ((0.0, 9.0, 8.0), 900, 6.0, (0.30, 0.88, 0.78)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT_PATH)
scene.render.film_transparent = False
scene.world.color = (0.002, 0.004, 0.01)
scene.view_settings.look = "AgX - Medium High Contrast"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
print(f"ARENA_CATALOG_OK {OUTPUT_PATH}")
