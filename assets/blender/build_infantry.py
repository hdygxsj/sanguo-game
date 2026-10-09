"""Original Han-inspired miniature spearman; no external commercial assets."""
from pathlib import Path
import math
import sys
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
ARCHER='--archer' in sys.argv
SWORD='--sword' in sys.argv
ASSET='han-archer' if ARCHER else 'han-swordsman' if SWORD else 'han-infantry'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name,color,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.8;p.inputs['Metallic'].default_value=metal
    return m

iron=material('iron-lamellar',(.13,.155,.16),.3)
cloth=material('linen-tunic',(.19,.24,.20))
leather=material('leather',(.11,.065,.035))
skin=material('skin',(.47,.31,.20))
wood=material('spear-wood',(.25,.145,.06))
edge=material('worn-bronze',(.31,.255,.14),.35)

def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat);return o

def sphere(name,p,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p)
    o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for face in o.data.polygons:face.use_smooth=True
    return finish(o,name,mat)

def box(name,p,scale,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p)
    o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('edge-softening','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat)

def rod(name,a,b,r,mat,r2=None):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=r if r2 is None else r2,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat)

# Human proportions, slightly separated feet and bent weapon arm.
for side in [-1,1]:
    x=side*.105
    box('cloth-shoe',(x,-.035,.045),(.125,.24,.09),leather,.025)
    rod('wrapped-calf',(x,0,.09),(x,.015,.48),.061,cloth,.073)
    rod('trouser-thigh',(x,.015,.48),(side*.09,0,.84),.08,cloth,.098)
    for z in [.18,.25,.32]:box('leg-binding',(x,-.055,z),(.12,.018,.022),leather)
box('tunic-skirt',(0,0,.83),(.37,.235,.34),cloth,.045)
box('torso',(0,0,1.115),(.40,.235,.43),cloth,.06)
rod('neck',(0,0,1.31),(0,0,1.44),.062,skin)
sphere('head',(0,-.01,1.49),(.104,.10,.135),skin)
box('nose',(0,-.108,1.48),(.026,.029,.045),skin,.008)
for side in [-1,1]:
    box('brow',(side*.043,-.098,1.527),(.037,.009,.009),leather)
    sphere('ear',(side*.10,0,1.49),(.015,.026,.035),skin)
# Rows of discrete overlapping plates, front/back and flared skirt.
for row in range(7):
    z=1.28-row*.071;width=.175 if row<5 else .19
    for col in range(6):
        x=(col-2.5)*width/3
        for side in [-1,1]:
            y=side*(.124+(.009 if row>=5 else 0))
            box('overlapping-lamella',(x,y,z),(.051,.026,.081),iron,.006)
            box('plate-lacing',(x,y+side*.015,z+.018),(.007,.007,.028),leather)
box('waist-belt',(0,-.005,.945),(.43,.29,.037),leather,.009)
box('belt-clasp',(0,-.158,.945),(.047,.016,.041),edge,.005)
# Helmet cap with cheek guards, brow band and short rear neck protection.
sphere('helmet-dome',(0,.005,1.59),(.118,.113,.103),iron)
box('helmet-brow',(0,-.11,1.56),(.20,.025,.022),edge,.008)
for side in [-1,1]:box('cheek-guard',(side*.099,-.025,1.47),(.028,.115,.15),iron,.018)
box('neck-guard',(0,.088,1.47),(.20,.038,.16),iron,.02)
rod('helmet-finial',(0,0,1.68),(0,0,1.73),.025,edge,.008)
# Shoulder plates and arms: right spear, left shield.
for side in [-1,1]:
    shoulder=(side*.235,0,1.27);elbow=(side*.30,-.025,1.065)
    hand=(side*.34,-.14,1.13)
    rod('sleeve',shoulder,elbow,.079,cloth,.061)
    rod('forearm',elbow,hand,.052,cloth,.042)
    sphere('hand',hand,(.041,.042,.058),skin)
    for row in range(3):box('shoulder-lamella',(side*(.23+row*.017),-.005,1.30-row*.047),(.125,.24,.057),iron,.012)
rod('spear-shaft',(.34,-.14,.035),(.34,-.14,2.28),.014,wood)
rod('spear-socket',(.34,-.14,2.20),(.34,-.14,2.32),.021,iron,.015)
# Leaf-shaped iron spearhead with a central ridge.
verts=[(.34,-.14,2.58),(.29,-.14,2.36),(.34,-.163,2.35),(.39,-.14,2.36),(.34,-.117,2.35),(.34,-.14,2.27)]
faces=[(0,1,2),(0,2,3),(0,3,4),(0,4,1),(5,2,1),(5,3,2),(5,4,3),(5,1,4)]
mesh=bpy.data.meshes.new('leaf-spearhead');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('leaf-spearhead',mesh);bpy.context.collection.objects.link(obj);finish(obj,'leaf-spearhead',iron)
box('shield-board',(-.34,-.215,1.08),(.31,.065,.53),wood,.045)
for x in [-.475,-.205]:box('shield-rim',(x,-.25,1.08),(.023,.019,.45),iron,.006)
for z in [.84,1.32]:box('shield-rim',(-.34,-.25,z),(.255,.019,.027),iron,.006)
for x in [-.40,-.28]:box('shield-plank-seam',(x,-.25,1.08),(.008,.008,.44),leather)
sphere('shield-boss',(-.34,-.26,1.08),(.047,.025,.047),iron)

if SWORD:
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('spear-','leaf-spearhead')):
            bpy.data.objects.remove(obj,do_unlink=True)
    # Downward held straight blade, bronze guard and ring pommel.
    rod('sword-grip',(.34,-.14,1.02),(.34,-.14,1.24),.023,leather)
    box('sword-guard',(.34,-.14,1.005),(.14,.052,.032),edge,.008)
    verts=[(.34,-.14,.34),(.304,-.14,.43),(.34,-.156,.43),(.376,-.14,.43),(.34,-.124,.43),
           (.304,-.14,.99),(.34,-.156,.99),(.376,-.14,.99),(.34,-.124,.99)]
    faces=[(0,1,2),(0,2,3),(0,3,4),(0,4,1),(1,5,6,2),(2,6,7,3),(3,7,8,4),(4,8,5,1),(5,8,7,6)]
    mesh=bpy.data.meshes.new('sword-blade');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('sword-blade',mesh);bpy.context.collection.objects.link(obj);finish(obj,'sword-blade',iron)
    bpy.ops.mesh.primitive_torus_add(major_radius=.037,minor_radius=.009,major_segments=16,minor_segments=6,location=(.34,-.14,1.278),rotation=(math.pi/2,0,0))
    finish(bpy.context.object,'ring-pommel',edge)

if ARCHER:
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('spear-','leaf-spearhead','shield-')):
            bpy.data.objects.remove(obj,do_unlink=True)
    # Resting bow in the left hand; curved wooden limbs and a taut string.
    points=[(-.34,-.14-.13*math.sin(math.pi*i/16),.58+i*.067) for i in range(17)]
    for i in range(16):rod('bow-limb',points[i],points[i+1],.013,wood)
    rod('bow-string',points[0],points[-1],.003,leather)
    rod('bow-grip',(-.34,-.27,1.06),(-.34,-.27,1.20),.019,leather)
    # Angled quiver and individually visible arrow shafts above the shoulder.
    rod('quiver',( .15,.19,.87),(.20,.22,1.37),.066,leather,.074)
    for i in range(5):
        x=.16+(i%3)*.031;y=.21+(i//3)*.029
        rod('arrow-shaft',(x,y,1.20),(x+.035,y,1.62),.005,wood)
        box('arrow-fletching',(x+.031,y,1.56),(.026,.008,.085),cloth)
    rod('quiver-strap',(-.15,-.144,1.28),(.15,-.144,.95),.018,leather)

# Apply node transforms so the shipping bounds are directly ground-aligned.
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Join by shared material, reducing the exported primitive count.
for mat in [iron,cloth,leather,skin,wood,edge]:
    group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();bpy.context.object.name=mat.name
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'assets/blender/{ASSET}.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/f'apps/web/public/models/agent-arena/{ASSET}.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)

bpy.ops.object.camera_add(location=(3,-6,3))
camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.27))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.05;bpy.context.scene.camera=camera
for p,energy in [((1,-3,5),550),((-3,1,4),400)]:
    bpy.ops.object.light_add(type='AREA',location=p);bpy.context.object.data.energy=energy;bpy.context.object.data.size=4
scene=bpy.context.scene;scene.world.color=(.25,.25,.25);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/f'qa-evidence/{ASSET}.png');bpy.ops.render.render(write_still=True)
