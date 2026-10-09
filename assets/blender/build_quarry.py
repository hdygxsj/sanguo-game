"""Original fractured quarry outcrop, with baked vertex colors and one mesh."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
rock = bpy.context.object
rock.name = 'quarry-fractured-outcrop'
for vertex in rock.data.vertices:
    x, y, z = vertex.co
    # Broad slanted fracture planes, finer erosion and a stable buried base.
    variation = 1 + .045 * math.sin(x * 8 + y * 5) * math.cos(z * 7)
    x = min(x, .67 + z * .18)
    y = max(y, -.65 + x * .16)
    z = min(z, .76 - x * .22)
    vertex.co = (x * variation, y * variation * .73, max(0, (z + .72) * .79))
colors = rock.data.color_attributes.new(name='quarry-strata', type='FLOAT_COLOR', domain='CORNER')
for face in rock.data.polygons:
    face.use_smooth = True
    for loop in face.loop_indices:
        v = rock.data.vertices[rock.data.loops[loop].vertex_index].co
        band = math.sin(v.z * 24 + v.x * 3 + v.y * 2)
        grain = math.sin(v.x * 37 + v.y * 23 + v.z * 19) * .018
        shade = .23 + .035 * band + grain
        # Narrow muted rusty mineral veins; soil-darkened foot.
        mineral = .035 if band > .82 else 0
        foot = .72 + .28 * min(1, v.z * 5)
        colors.data[loop].color = ((shade + mineral) * foot, shade * foot, (shade - mineral * .5) * foot, 1)
mat = bpy.data.materials.new('quarry-stone')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Roughness'].default_value = .98
color_node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name = colors.name
mat.node_tree.links.new(color_node.outputs['Color'], bsdf.inputs['Base Color'])
rock.data.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets/blender/quarry-outcrop.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'apps/web/public/models/agent-arena/quarry-outcrop.glb'), export_format='GLB', use_selection=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.world.color = (.35, .35, .35)
bpy.ops.object.camera_add(location=(3, -4, 2.7))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, .5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.2
scene.camera = camera
bpy.ops.object.light_add(type='AREA', location=(1, -3, 5))
bpy.context.object.data.energy = 450
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 4
scene.render.resolution_x = 900
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.filepath = str(ROOT / 'qa-evidence/quarry-outcrop.png')
bpy.ops.render.render(write_still=True)
