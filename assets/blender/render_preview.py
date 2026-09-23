from pathlib import Path

import bpy
import mathutils


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "assets" / "blender" / "arena-kit.blend"
OUTPUT_PATH = ROOT / "apps" / "web" / "public" / "images" / "arena-fallback.png"


def point_camera(camera, target=(0, 0, 0)):
    direction = mathutils.Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))
placements = {
    "imperial": (0.0, 0.0, 0.18),
    "stronghold": (-3.2, 1.8, 0.05),
    "citadel": (3.0, 1.6, 0.05),
    "fort": (-3.0, -2.0, 0.05),
    "village-a": (3.0, -2.0, 0.05),
    "village-b": (0.0, -3.0, 0.05),
    "mountain": (-5.0, 0.0, 0.0),
    "grove": (5.0, -0.1, 0.0),
}
for name, position in placements.items():
    root = bpy.data.objects.get(name)
    if root:
        root.location = position

bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, -0.08))
ground = bpy.context.object
ground.name = "preview-ground"
material = bpy.data.materials.new("preview-ground-material")
material.diffuse_color = (0.018, 0.035, 0.032, 1)
material.use_nodes = True
shader = material.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value = material.diffuse_color
shader.inputs["Roughness"].default_value = 0.94
ground.data.materials.append(material)

bpy.ops.object.camera_add(location=(10.5, -12.5, 10.2))
camera = bpy.context.object
point_camera(camera, (0, -0.25, 0.25))
camera.data.lens = 52
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(2.5, -3.0, 11.0))
key = bpy.context.object
key.data.energy = 1400
key.data.shape = "DISK"
key.data.size = 8
key.data.color = (1.0, 0.74, 0.48)

bpy.ops.object.light_add(type="AREA", location=(-7.0, 2.0, 6.0))
fill = bpy.context.object
fill.data.energy = 950
fill.data.size = 7
fill.data.color = (0.34, 0.44, 1.0)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.filepath = str(OUTPUT_PATH)
scene.world.color = (0.003, 0.004, 0.012)
scene.view_settings.look = "AgX - Medium High Contrast"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
print(f"ARENA_PREVIEW_OK {OUTPUT_PATH}")
