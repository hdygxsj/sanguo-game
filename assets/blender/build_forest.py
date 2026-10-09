"""Original open-crowned pine for the Chinese landscape miniature."""
from pathlib import Path
import math
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def material(name,color):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=mat.diffuse_color;p.inputs['Roughness'].default_value=.95
    return mat
bark=material('pine-bark',(.145,.11,.075))
needles=material('pine-needles',(.075,.13,.085))
tips=material('pine-tips',(.12,.18,.105))

def branch(a,b,r1,r2):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r1,radius2=r2,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    obj=bpy.context.object;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(bark)
    for face in obj.data.polygons:face.use_smooth=True

def crown(point,width,index):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=5,location=point)
    obj=bpy.context.object;obj.name='layered-needle-crown';obj.scale=(width,width*.78,width*.30)
    for vertex in obj.data.vertices:
        p=vertex.co
        wave=1+.19*math.sin(p.x*19+p.y*13+index*2)+.07*math.cos(p.y*27-p.z*11)
        p.x*=wave;p.y*=wave;p.z*=1+.16*math.sin(p.x*11+index)
    obj.data.materials.append(tips if index%3==0 else needles)
    for face in obj.data.polygons:face.use_smooth=True

trunk=[(0,0,0),(.04,.01,.8),(-.055,.025,1.55),(.07,0,2.25),(.12,.06,2.9),(.08,.035,3.35)]
for i in range(len(trunk)-1):branch(trunk[i],trunk[i+1],.10-i*.014,.085-i*.014)
for i in range(12):
    angle=i*2.39996
    z=1.28+i*.15;length=.70-.026*i
    root=(.01,0,z-.1);elbow=(math.cos(angle)*length*.5,math.sin(angle)*length*.5,z-.14)
    end=(math.cos(angle)*length,math.sin(angle)*length,z+.06)
    branch(root,elbow,.04-.0018*i,.026-.001*i);branch(elbow,end,.026-.001*i,.012)
    crown(end,.39-.010*i,i)
    fork=(end[0]+.20*math.cos(angle+.9),end[1]+.20*math.sin(angle+.9),end[2]+.06)
    branch(elbow,fork,.019,.008);crown(fork,.25-.005*i,i+17)
crown((.08,.035,3.29),.32,30)

for mat in [bark,needles,tips]:
    group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group:obj.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();obj=bpy.context.object;obj.name=mat.name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for vertex in obj.data.vertices:vertex.co.z=max(0,vertex.co.z)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
assert triangles<3200,triangles
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/shan-shui-pine.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'apps/web/public/models/agent-arena/shan-shui-pine.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
print(f'PINE_VERIFY_OK triangles={triangles}',flush=True)
bpy.ops.object.camera_add(location=(4,-6,3.6))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.7))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=4.0;bpy.context.scene.camera=camera
for point,power in [((1,-3,5),650),((-3,1,4),450)]:
    bpy.ops.object.light_add(type='AREA',location=point);bpy.context.object.data.energy=power;bpy.context.object.data.size=4
scene=bpy.context.scene;scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'qa-evidence/shan-shui-pine.png');bpy.ops.render.render(write_still=True)
