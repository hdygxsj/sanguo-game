"""Mounted Han miniature assembled from this project's original source meshes."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def append_meshes(filename):
    with bpy.data.libraries.load(str(ROOT/'assets/blender'/filename),link=False) as (source,target):
        target.objects=source.objects
    meshes=[]
    for obj in target.objects:
        if obj and obj.type=='MESH':
            bpy.context.collection.objects.link(obj);meshes.append(obj)
    return meshes

append_meshes('pasture-horse.blend')
for obj in append_meshes('han-infantry.blend'):
    # Source is ground-aligned; a seated hip sits just above the saddle.
    # Widen the lower limbs around the barrel, retaining the upper-body scale.
    for vertex in obj.data.vertices:
        x,y,z=vertex.co
        if z<.84 and abs(x)<.23:
            amount=max(0,min(1,(.84-z)/.36))
            x+=(-1 if x<0 else 1)*.20*amount
            y-=.12*math.sin(math.pi*max(0,min(1,z/.84)))
        vertex.co=(-y,x,z+.65)
    obj.name='rider-'+obj.name

saddle=bpy.data.materials.new('saddle-leather');saddle.diffuse_color=(.15,.09,.045,1);saddle.use_nodes=True
shader=saddle.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=saddle.diffuse_color
shader.inputs['Roughness'].default_value=.87
def box(name,point,size):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point)
    obj=bpy.context.object;obj.name=name;obj.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=obj.modifiers.new('rounded-leather','BEVEL');bevel.width=.03;bevel.segments=2
    bpy.ops.object.modifier_apply(modifier=bevel.name);obj.data.materials.append(saddle)

def strap(name,a,b,r=.013):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(saddle)

box('saddle-seat',(-.02,0,1.36),(.46,.43,.09))
box('saddle-front',(.21,0,1.43),(.07,.45,.17))
box('saddle-back',(-.25,0,1.44),(.07,.45,.18))
for side in [-1,1]:
    box('saddle-flap',(-.01,side*.255,1.18),(.38,.035,.35))
    strap('bridle-cheek',(.79,side*.12,1.80),(1.13,side*.11,1.56))
    strap('rein',(.95,side*.12,1.59),(.39,side*.22,1.58))
    strap('rein',(.39,side*.22,1.58),(.14,side*.34,1.78))
strap('nose-band',(1.12,-.11,1.58),(1.12,.11,1.58))

for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.rotation_euler.z=-math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==saddle]
bpy.ops.object.select_all(action='DESELECT')
for obj in group:obj.select_set(True)
bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();bpy.context.object.name='saddle-leather'
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
assert triangles<22000,triangles
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/han-cavalry.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'apps/web/public/models/agent-arena/han-cavalry.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
print(f'CAVALRY_VERIFY_OK triangles={triangles}',flush=True)
bpy.ops.object.camera_add(location=(4,-6,3.4))
camera=bpy.context.object;camera.rotation_euler=(Vector((.05,0,1.5))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.8;bpy.context.scene.camera=camera
for point,energy in [((1,-3,5),600),((-3,1,4),450)]:
    bpy.ops.object.light_add(type='AREA',location=point);bpy.context.object.data.energy=energy;bpy.context.object.data.size=4
scene=bpy.context.scene;scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'qa-evidence/han-cavalry.png');bpy.ops.render.render(write_still=True)
