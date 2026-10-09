"""Original pasture horse: Blender source, shipping GLB and inspection render."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .92
    return m

coat = material('horse-chestnut', (.24, .125, .065))
dark = material('horse-mane-hooves', (.042, .032, .026))
mark = material('horse-muzzle', (.13, .10, .08))
parts = []

def ellipsoid(name, p, scale, mat, rotation=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=p)
    o = bpy.context.object; o.name = name; o.scale = scale; o.rotation_euler.y = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    for face in o.data.polygons: face.use_smooth = True
    parts.append(o); return o

def limb(name, a, b, upper, lower, mat):
    d = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=upper, radius2=lower, depth=d.length, location=(Vector(a)+Vector(b))/2)
    o = bpy.context.object; o.name = name; o.rotation_euler = d.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(mat)
    for face in o.data.polygons: face.use_smooth = True
    parts.append(o)

ellipsoid('barrel', (0,0,1.02), (.64,.245,.32), coat)
ellipsoid('haunch', (-.44,0,1.03), (.28,.255,.34), coat)
ellipsoid('shoulder', (.40,0,1.07), (.27,.23,.33), coat)
ellipsoid('neck', (.57,0,1.40), (.19,.14,.43), coat, .40)
ellipsoid('head', (.84,0,1.70), (.245,.115,.145), coat, .5)
ellipsoid('long-muzzle', (1.00,0,1.59), (.21,.105,.105), coat, .5)
ellipsoid('nose', (1.16,0,1.51), (.075,.085,.065), mark, .5)
for side in [-1,1]:
    ellipsoid('ear', (.76,side*.070,1.86), (.032,.024,.095), coat, -.17)
    ellipsoid('eye', (.85,side*.109,1.73), (.014,.006,.012), dark)
    ellipsoid('nostril', (1.18,side*.069,1.52), (.016,.004,.012), dark)
    for rear in [False,True]:
        x = -.44 if rear else .43; y = side*.16
        knee = (x+(.14 if rear else -.025),y,.47)
        hoof = (x+(.04 if rear else .03),y,.065)
        limb('upper-leg', (x,y,.95), knee, .095, .049, coat)
        ellipsoid('knee', knee, (.064,.057,.072), coat)
        limb('lower-leg', knee, hoof, .044, .034, coat)
        ellipsoid('hoof', (hoof[0]+.025,y,.063), (.085,.059,.062), dark)
for i in range(7):
    t = i/6
    ellipsoid('mane', (.25+t*.37,0,1.30+t*.55), (.075,.045,.13), dark, .35)
limb('tail-root', (-.66,0,1.10), (-.80,0,.83), .065,.055,dark)
ellipsoid('tail', (-.83,0,.59), (.065,.045,.33), dark, -.15)

# Batch by material, preserve ground pivot and metre-space orientation.
for mat in [coat,dark,mark]:
    bpy.ops.object.select_all(action='DESELECT')
    group=[o for o in bpy.data.objects if o.type=='MESH' and o.data.materials[0]==mat]
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    if len(group)>1:bpy.ops.object.join()
    bpy.context.object.name=mat.name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if mat==coat:
        obj=bpy.context.object
        remesh=obj.modifiers.new('fused-anatomy','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.025;remesh.use_smooth_shade=True
        bpy.ops.object.modifier_apply(modifier=remesh.name)
        smooth=obj.modifiers.new('anatomy-smoothing','SMOOTH');smooth.factor=.8;smooth.iterations=3
        bpy.ops.object.modifier_apply(modifier=smooth.name)
        decimate=obj.modifiers.new('pasture-lod','DECIMATE');decimate.ratio=.28
        bpy.ops.object.modifier_apply(modifier=decimate.name)
meshes=[o for o in bpy.data.objects if o.type=='MESH']
triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
assert len(meshes)==3 and 1000<triangles<16000, triangles
assert min(v.co.z for o in meshes for v in o.data.vertices)>=0
blend=ROOT/'assets/blender/pasture-horse.blend'
glb=ROOT/'apps/web/public/models/agent-arena/pasture-horse.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
print(f'HORSE_VERIFY_OK meshes=3 triangles={triangles}',flush=True)

bpy.ops.object.camera_add(location=(3.2,-5,2.6))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.4;bpy.context.scene.camera=camera
for p,energy in [((1,-3,5),600),((-3,1,4),450)]:
    bpy.ops.object.light_add(type='AREA',location=p);bpy.context.object.data.energy=energy;bpy.context.object.data.size=4
scene=bpy.context.scene;scene.world.color=(.35,.35,.35);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'qa-evidence/pasture-horse.png');bpy.ops.render.render(write_still=True)
