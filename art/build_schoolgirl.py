"""Run with Blender -b -P this_file -- running.fbx output.glb."""
import math
import sys
import bpy
import bmesh

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
    attach(obj,bone)

def oval(name, pos, scale, mat, bone, tilt=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=pos)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    obj.rotation_euler.y=tilt
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(mat)
    attach(obj,bone)

rings('Pleated skirt',[(.54,.34,.27),(.64,.32,.25),(.99,.215,.174),(1.045,.207,.168)],navy,'Hips',True)
for z in [.565,.59]:
    r=.34-(z-.54)*.2
    rings('Woven hem stripe',[(z,r+.002,r-.068),(z+.006,r+.002,r-.068)],white,'Hips',True)
rings('Blouse',[(.99,.215,.175),(1.16,.213,.17),(1.34,.245,.188),(1.43,.214,.16),(1.49,.087,.09)],blue,'Spine1')
rings('Waistband',[(.993,.22,.18),(1.04,.215,.175)],navy,'Hips')
rings('Sailor collar',[(1.385,.237,.183),(1.44,.218,.164),(1.492,.084,.091)],navy,'Spine2')
rings('Collar piping',[(1.40,.235,.182),(1.408,.233,.18)],white,'Spine2')
for side,sign in [('Left',1),('Right',-1)]:
    oval('Puff sleeve',(.243*sign,.05,1.41),(.111,.115,.108),blue,side+'Arm')
    oval('Sleeve cuff',(.324*sign,.055,1.404),(.021,.085,.082),navy,side+'Arm')
    oval('Bow loop',(.051*sign,-.151,1.365),(.065,.031,.045),navy,'Spine2',sign*.4)
    oval('Ribbon tail',(.032*sign,-.163,1.31),(.019,.021,.054),navy,'Spine2',-sign*.3)
oval('Bow knot',(0,-.174,1.364),(.024,.021,.023),white,'Spine2')
for image in bpy.data.images:
    if image.size[0]>1024:
        image.scale(1024,1024)
        image.pack()
rig.data.pose_position='POSE'
scene=bpy.context.scene
scene.frame_start,scene.frame_end=map(int,action.frame_range)
scene.frame_set(scene.frame_start)
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',export_animations=True,export_frame_range=True)
