"""Restore the running FBX costume and style the hair. Then run retarget_schoolgirl.py."""
import math
import sys
import bpy
import numpy as np

source, target = sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()

# The FBX shares one atlas between skin, sneakers and clothes. Give only
# the body its own diffuse copy so wardrobe textures retain the source colours.
def tint(obj, hair=False):
    mat = obj.data.materials[0].copy()
    obj.data.materials[0] = mat
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = shader.inputs['Base Color'].links[0].from_node
    image = node.image.copy()
    image.scale(1024,1024)
    pixels = np.empty(len(image.pixels),dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1,4)[:,:3]
    if hair:
        light = np.sqrt(rgb @ [.21,.72,.07])[:,None]
        rgb[:] = np.minimum(1,(.21+light*.87)*[.80,.65,.55])
    else:
        red,green,blue = rgb.T
        mask = ((red>green*1.08)&(green>blue*1.02)&(red>.045))[:,None]
        rgb[:] = np.where(mask,np.minimum(1,rgb**.76*[1.07,1.08,1.10]+[.035,.024,.024]),rgb)
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    node.image=image

tint(bpy.data.objects['Ch02_Body'])
tint(bpy.data.objects['Ch02_Hair'],True)

def material(name,color):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    return mat

locks=[material('Champagne',(.54,.39,.30)),material('Ash blonde',(.62,.48,.40)),material('Honey shadow',(.40,.28,.22))]
shine=material('Silk highlights',(.78,.65,.56))
pearl=material('Pearl pins',(.94,.89,.77))

def skin(obj):
    head=obj.vertex_groups.new(name='mixamorig:Head')
    back=obj.vertex_groups.new(name='mixamorig:Spine2')
    for v in obj.data.vertices:
        w=min(1,max(0,(v.co.z-1.32)/.24))
        head.add([v.index],w,'REPLACE')
        back.add([v.index],1-w,'REPLACE')
    obj.parent=rig
    obj.matrix_parent_inverse=rig.matrix_world.inverted()
    mod=obj.modifiers.new('Follow runner','ARMATURE')
    mod.object=rig

def strand(name,points,width,mat):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'
    curve.resolution_u=3
    curve.bevel_depth=width
    curve.bevel_resolution=3
    curve.use_fill_caps=True
    spline=curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for b,(x,y,z,r) in zip(spline.bezier_points,points):
        b.co=(x,y,z)
        b.radius=r
        b.handle_left_type=b.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.data.materials.append(mat)
    skin(obj)

# Opaque crown under the alpha-cut hair cards. Sweep ridges from the
# hairline over the crown, following the head down into the braid.
def scalp(theta, phi, offset=0):
    return ((.096+offset)*math.sin(theta)*math.cos(phi),
            .048+(.124+offset)*math.sin(theta)*math.sin(phi),
            1.641+(.129+offset)*math.cos(theta))

verts=[scalp(0,0)]
faces=[]
for row in range(1,17):
    for i in range(64):
        phi=i*math.tau/64
        extent=1.75+.57*math.sin(phi)
        verts.append(scalp(extent*row/16,phi))
        a=1+(row-1)*64+i
        b=1+(row-1)*64+(i+1)%64
        faces.append((0,a,b) if row==1 else (a-64,a,b,b-64))
mesh=bpy.data.meshes.new('Solid swept crown')
mesh.from_pydata(verts,[],faces)
cap=bpy.data.objects.new('Ash blonde crown',mesh)
bpy.context.collection.objects.link(cap)
mesh.materials.append(locks[1])
for poly in mesh.polygons:poly.use_smooth=True
skin(cap)
for i in range(44):
    phi=i*math.tau/44
    path=[]
    for j in range(19):
        t=j/18
        theta=.08+t*(1.64+.55*math.sin(phi))
        path.append((*scalp(theta,phi+.32*(1-t),.0007),.35+.65*math.sin(t*math.pi)))
    strand('Crown comb line',path,.0015,locks[i%3])
for k in range(3):
    path=[]
    for i in range(45):
        t=i/44
        a=t*math.tau*2.15+k*math.tau/3
        taper=1-.67*t
        x=.043*taper*math.sin(a)+.012*math.sin(t*4)
        y=.146+.062*math.sin(t*math.pi*.55)+.019*taper*math.sin(2*a)
        path.append((x,y,1.665-.40*t,taper*(1 if i<42 else (45-i)/3)))
    strand('Interwoven lock',path,.029,locks[k])
    for offset in [-.006,.003]:
        strand('Strand glint',[(x+offset*r,y+.026*r,z,r) for x,y,z,r in path],.0013,shine)
for side in [-1,1]:
    for j in range(3):
        path=[]
        for i in range(12):
            t=i/11
            a=.15+1.36*t
            path.append((side*.094*math.cos(a),.047+.12*math.sin(a),1.67+.023*j-.047*math.sin(math.pi*t)-.025*t,.65+.33*math.sin(math.pi*t)))
        strand('Swept crown twist',path,.012,locks[j])
    for j in range(4):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.0055,location=(side*(.063-.012*j),.141+.008*j,1.684+.007*math.sin(j)))
        obj=bpy.context.object
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        obj.data.materials.append(pearl)
        skin(obj)

for image in bpy.data.images:
    if image.size[0]>1024:
        image.scale(1024,1024)
        image.pack()
rig.data.pose_position='POSE'
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',export_animations=False)
