"""Run with Blender -b -P this_file -- running.fbx output.glb."""
import math
import sys
import bpy
import bmesh
from mathutils import Vector

source, target = sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
action = rig.animation_data.action
action.name = 'Run'
# Build clothing in bind space, then let it follow the performer's skeleton.
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()
bpy.data.objects.remove(bpy.data.objects['Ch02_Cloth'], do_unlink=True)
body = bpy.data.objects['Ch02_Body']
bm = bmesh.new()
bm.from_mesh(body.data)
hidden = []
for face in bm.faces:
    x,y,z = body.matrix_world @ face.calc_center_median()
    if .57 < z < 1.48 and abs(x) < (.24 if z < 1.34 else .27):
        hidden.append(face)
bmesh.ops.delete(bm,geom=hidden,context='FACES')
bm.to_mesh(body.data)
bm.free()

def fabric(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    return m

blue = fabric('Sky blue cotton', (.37,.65,.89))
navy = fabric('Marine blue twill', (.055,.17,.36))
white = fabric('Ivory piping', (.94,.96,1))
def attach(obj, bone):
    group = obj.vertex_groups.new(name='mixamorig:'+bone)
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod = obj.modifiers.new('Uniform skin','ARMATURE')
    mod.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()

def rings(name, levels, mat, bone, pleats=False):
    verts, faces = [], []
    count=64
    for z,rx,ry in levels:
        for i in range(count):
            a=i*2*math.pi/count
            fold=1-(.075 if pleats and i%4==0 else 0)
            verts.append((rx*math.cos(a)*fold,.022+ry*math.sin(a)*fold,z))
    for row in range(len(levels)-1):
        for i in range(count):
            a=row*count+i
            b=row*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    faces.append(tuple(range((len(levels)-1)*count,len(verts))))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = True
    attach(obj,bone)
    return obj

def oval(name, pos, scale, mat, bone, tilt=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=pos)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    obj.rotation_euler.y=tilt
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    attach(obj,bone)

# Shorter, softer folds taper into the waist, with both stripes following the folds.
def skirt_ring(z, extra=0):
    t=(1.045-z)/.47
    return z,.179+.108*t+extra,.146+.082*t+extra

rings('Pleated skirt',[skirt_ring(z) for z in [.575,.60,.70,.83,.96,1.045]],navy,'Hips',True)
for z in [.599,.619]:
    rings('Hem braid',[skirt_ring(z,.0018),skirt_ring(z+.006,.0018)],white,'Hips',True)
blouse=rings('Tailored cotton blouse',[(1.003,.177,.145),(1.06,.181,.148),
    (1.15,.169,.142),(1.24,.184,.153),(1.33,.201,.156),
    (1.407,.206,.141),(1.45,.169,.115),(1.49,.081,.085)],blue,'Spine1')
rings('Waistband',[(1.011,.184,.151),(1.048,.181,.149)],navy,'Hips')

# Skin each sleeve across the elbow using actual bind joints, including the forearm
# that the original costumed character doesn't model underneath its clothing.
def sleeve(side):
    names=[side+n for n in ('Arm','ForeArm','Hand')]
    joints=[rig.matrix_world@rig.data.bones['mixamorig:'+n].head_local for n in names]
    rows=[(0,.086),(.16,.094),(.43,.081),(.74,.067),(1,.057),
          (1.28,.054),(1.58,.049),(1.85,.039),(2.025,.034)]
    verts=[];faces=[];weights=[]
    for t,r in rows:
        seg=min(int(t),1)
        center=joints[seg].lerp(joints[seg+1],t-seg)
        axis=(joints[seg+1]-joints[seg]).normalized()
        u=axis.cross(Vector((0,0,1))).normalized();v=axis.cross(u)
        for i in range(24):
            a=i*math.tau/24
            verts.append(center+r*(u*math.cos(a)+v*math.sin(a)))
            weights.append(max(0,min(1,(t-.74)/.54)))
    for j in range(len(rows)-1):
        for i in range(24):
            n=j*24+i;k=j*24+(i+1)%24;faces.append((n,k,k+24,n+24))
    mesh=bpy.data.meshes.new('Shaped sleeve');mesh.from_pydata(verts,[],faces)
    obj=bpy.data.objects.new(side+' sleeve',mesh);bpy.context.collection.objects.link(obj)
    for m in (blue,navy):mesh.materials.append(m)
    for poly in mesh.polygons:
        poly.use_smooth=True;poly.material_index=int(poly.index>=24*(len(rows)-2))
    attach(obj,names[0])
    arm=obj.vertex_groups[0];fore=obj.vertex_groups.new(name='mixamorig:'+names[1])
    for i,w in enumerate(weights):
        arm.add([i],1-w,'REPLACE');fore.add([i],w,'REPLACE')

# A broad rectangular sailor flap and twin U-shaped embroidered stripes face the player.
def back_panel(name,coords,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(coords,[],[(0,1,2,3)])
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat);attach(obj,'Spine1')
for sign,side in [(1,'Left'),(-1,'Right')]:
    sleeve(side)
    oval('Bow loop',(.048*sign,-.133,1.364),(.06,.028,.036),navy,'Spine1',sign*.4)
    oval('Ribbon tail',(.028*sign,-.138,1.31),(.017,.018,.055),navy,'Spine1',-sign*.3)
oval('Bow knot',(0,-.149,1.364),(.022,.02,.02),white,'Spine1')
levels=[(1.46,.115,.091),(1.415,.162,.143),(1.35,.155,.176),(1.245,.14,.179)]
for n,((z,w,y),(zz,ww,yy)) in enumerate(zip(levels,levels[1:])):
    def panel_strip(name,l,r,mat,offset):
        back_panel(name,[(l*w,y+offset,z),(r*w,y+offset,z),(r*ww,yy+offset,zz),(l*ww,yy+offset,zz)],mat)
    panel_strip('Sailor flap',-1,1,navy,0)
    for x in (.81,.91):
        for sign in (-1,1):panel_strip('Collar braid',sign*x-.015,sign*x+.015,white,.0012)
for z in (1.256,1.269):
    back_panel('Back braid',[(-.13,.1804,z),(.13,.1804,z),(.13,.1804,z+.004),(-.13,.1804,z+.004)],white)
for image in bpy.data.images:
    if image.size[0]>1024:
        image.scale(1024,1024)
        image.pack()
rig.data.pose_position='POSE'
scene=bpy.context.scene
scene.frame_start,scene.frame_end=map(int,action.frame_range)
scene.frame_set(scene.frame_start)
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',export_animations=True,export_frame_range=True)
