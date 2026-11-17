import bpy
import bmesh
import hashlib
import math
import random
import sys
from pathlib import Path
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

source, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def import_fbx(name):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(source / name))
    objects = set(bpy.data.objects) - previous
    return next(o for o in objects if o.type == 'ARMATURE'), objects

rig, model = import_fbx("Hip Hop Dancing(1).fbx")
rig.animation_data_clear()
meshes = [o for o in model if o.type == 'MESH']
body = next(obj for obj in meshes if obj.name == 'Boy01_Body_Geo')
mesh = bmesh.new()
mesh.from_mesh(body.data)
mesh.verts.ensure_lookup_table()

def connected_island(seed, expected):
    island = {mesh.verts[seed]}
    stack = list(island)
    while stack:
        current = stack.pop()
        for edge in current.link_edges:
            neighbor = edge.other_vert(current)
            if neighbor not in island:
                island.add(neighbor)
                stack.append(neighbor)
    if len(island) != expected:
        raise ValueError('Unexpected head topology for Boy01')
    return island

head = connected_island(3448, 532)
old_hair = connected_island(1133, 435)
cap = connected_island(2236, 180) | connected_island(2416, 21)
head_indices = {v.index for v in head}
to_model = body.matrix_world.copy()
to_mesh = to_model.inverted()
head_triangles = []
body.data.calc_loop_triangles()
uv_layer = body.data.uv_layers.active.data
for triangle in body.data.loop_triangles:
    if all(index in head_indices for index in triangle.vertices):
        points = [to_model @ body.data.vertices[i].co for i in triangle.vertices]
        uv = [tuple(uv_layer[i].uv) for i in triangle.loops]
        head_triangles.append((points, uv))

# Remove the old haircut's baked shadow from the head UVs and add subtle stubble.
material = body.data.materials[0]
shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
diffuse = shader.inputs['Base Color'].links[0].from_node.image
diffuse.scale(1024, 1024)
size = diffuse.size[0]
pixels = np.empty(size * size * 4, dtype=np.float32)
diffuse.pixels.foreach_get(pixels)
pixels = pixels.reshape((size, size, 4))
original = pixels.copy()
stubble = np.random.default_rng(17).uniform(0, 1, (size, size))
for points, uv in head_triangles:
    a, b, c = np.asarray(uv) * size - .5
    lo = np.maximum(0, np.floor(np.min([a, b, c], axis=0)).astype(int))
    hi = np.minimum(size - 1, np.ceil(np.max([a, b, c], axis=0)).astype(int))
    xx, yy = np.meshgrid(np.arange(lo[0], hi[0]+1), np.arange(lo[1], hi[1]+1))
    ab, ac = b-a, c-a
    det = ab[0]*ac[1] - ab[1]*ac[0]
    if abs(det) < .0001:
        continue
    u = ((xx-a[0])*ac[1] - (yy-a[1])*ac[0]) / det
    v = (ab[0]*(yy-a[1]) - ab[1]*(xx-a[0])) / det
    x, y, z = np.asarray(points[0])[:,None,None] + u*np.asarray(points[1]-points[0])[:,None,None] + v*np.asarray(points[2]-points[0])[:,None,None]
    rgb = original[yy, xx, :3]
    luminance = rgb @ np.array([.21,.72,.07])
    front = np.clip((-y - .015) / .19, 0, 1)
    hairline = 1.385 + .237*front
    rise = np.clip((z-hairline)/.046, 0, 1)
    amount = rise * np.clip((.57-luminance)/.19, 0, 1)
    noise = stubble[yy, xx]
    dots = np.where(noise < .14, .095, 0)
    skin = np.array([.72,.53,.405]) + (.037*noise - dots + .045*(z-1.62))[:,:,None]
    inside = (u >= -.018) & (v >= -.018) & (u+v <= 1.018) & (amount > 0)
    blend = amount[:,:,None] * skin + (1-amount[:,:,None]) * rgb
    pixels[yy[inside], xx[inside], :3] = blend[inside]

diffuse.pixels.foreach_set(pixels.ravel())
diffuse.update()
diffuse.pack()
exec(Path(__file__).with_name('school_uniform.py').read_text())
bmesh.ops.delete(mesh, geom=list(cap | old_hair), context='VERTS')
mesh.to_mesh(body.data)
mesh.free()
body.data.update()

# Fit a dark crown to the original scalp. Angles are measured from straight up.
scalp = BVHTree.FromPolygons(
    [point for triangle, _ in head_triangles for point in triangle],
    [tuple(range(i, i + 3)) for i in range(0, 3 * len(head_triangles), 3)],
    all_triangles=True,
)
origin = Vector((0, -.02, 1.608))

def surface(normal):
    point, *_ = scalp.ray_cast(origin + normal * .5, -normal, .51)
    if point is None:
        raise ValueError(f'Missing scalp along {tuple(normal)}')
    return point

def polar(theta, azimuth):
    return Vector((math.sin(theta)*math.sin(azimuth),
                   -math.sin(theta)*math.cos(azimuth), math.cos(theta)))

def fade(low, high, value):
    t = min(1, max(0, (value - low) / (high - low)))
    return t * t * (3 - 2*t)

def hairline(azimuth):
    rear = fade(.1, .86, -math.cos(azimuth))
    return 1.17 + .27 * abs(math.sin(azimuth)) + .68 * rear + .045 * math.sin(3 * azimuth + .3)

def crown(normal):
    theta = math.acos(max(-1, min(1, normal.z)))
    azimuth = math.atan2(normal.x, -normal.y)
    edge = hairline(azimuth)
    top = fade(.04, .73, normal.z)
    front = fade(-.48, .65, -normal.y)
    taper = fade(0, .30, edge-theta)
    depth = .008 + taper*(.015 + top*(.025 + .052*front))
    return surface(normal) + normal*depth

verts, faces, slots = [], [], []
def face(indices, slot):
    faces.append(indices)
    slots.append(slot)

segments, rings = 76, 23
verts.append(crown(Vector((0,0,1))))
for ring in range(1, rings+1):
    for j in range(segments):
        azimuth = math.tau*j/segments
        normal = polar(hairline(azimuth)*ring/rings, azimuth)
        verts.append(crown(normal))
for j in range(segments):
    face((0, 1+j, 1+(j+1)%segments), 0)
for ring in range(1, rings):
    for j in range(segments):
        i = 1+(ring-1)*segments+j
        k = 1+(ring-1)*segments+(j+1)%segments
        face((i, i+segments, k+segments, k), 0)

# Shallow grooves across each curved lock catch light like combed strands.
rng = random.Random(43)
def add_lock(path, width, depth, slot):
    start = len(verts)
    sections, sides = len(path), 20
    for i, (point, normal) in enumerate(path):
        tangent = path[min(i+1, sections-1)][0] - path[max(i-1,0)][0]
        tangent.normalize()
        across = tangent.cross(normal).normalized()
        outward = across.cross(tangent).normalized()
        t = i/(sections-1)
        taper = (.16 + .84*fade(0,.25,t)) * (1-.98*fade(.48,1,t))
        for j in range(sides):
            a = math.tau*j/sides
            flute = 1 + .19*math.cos(7*a + .38*math.sin(t*3))
            verts.append(point + across*(width*taper*math.cos(a))
                         + outward*(depth*taper*math.sin(a)*flute))
        if i:
            previous = start+(i-1)*sides
            for j in range(sides):
                k = (j+1)%sides
                face((previous+j, previous+sides+j, previous+sides+k, previous+k),slot)
    face(tuple(start+j for j in range(sides)), slot)
    end = start+(sections-1)*sides
    face(tuple(end+j for j in reversed(range(sides))), slot)

# Long crown locks rise off the forehead and sweep back and outward.
for layer in range(3):
    for lane in range(19):
        column = (lane-9)/9
        x_start = column*.85 + rng.uniform(-.035,.035)
        a_start = [.37,.80,1.20][layer] + .23*abs(column) + rng.uniform(-.09,.08)
        a_end = min(2.98, a_start + [1.48,1.42,1.29][layer] + rng.uniform(-.13,.18))
        flow = .20*math.sin(column*2.5+.62) + .14
        phase = rng.uniform(-.55,.55)
        path = []
        for i in range(19):
            t = i/18
            a = a_start+(a_end-a_start)*t
            x = x_start*(1-.22*t) + flow*math.sin(t*math.pi*.90) + .088*math.sin(t*math.tau+phase)
            x = max(-.91,min(.91,x))
            radius = math.sqrt(1-x*x)
            normal = Vector((x, -math.cos(a)*radius, math.sin(a)*radius))
            theta = math.acos(normal.z)
            azimuth = math.atan2(normal.x,-normal.y)
            if theta > hairline(azimuth):
                normal = polar(hairline(azimuth)-.006,azimuth)
            volume = .003 + (.015 + .012*(1-abs(column)))*(1-layer*.19)*math.sin(math.pi*t)
            wave = .007*math.sin(t*math.tau + phase)
            path.append((crown(normal) + normal*(volume+wave), normal))
        add_lock(path, rng.uniform(.016,.027), rng.uniform(.007,.012), rng.randrange(1,7))

def cubic(a,b,c,d,t):
    m = 1-t
    return a*m**3 + b*(3*m*m*t) + c*(3*m*t*t) + d*t**3

# Overlapping rear layers narrow around the neck, then kick outward at the ends.
for row in range(3):
    for i in range(17):
        column = (i-8)/8
        phi = math.pi + column*(.82+row*.08) + rng.uniform(-.08,.08)
        theta = .73 + row*.39 + rng.uniform(-.13,.13)
        n = polar(theta,phi)
        start = crown(n) + n*(.010+row*.003)
        x = -column
        z = [1.50,1.41,1.325][row] + .026*abs(column) + rng.uniform(-.035,.032)
        finish = Vector((x*(.117+row*.016)+rng.uniform(-.022,.022), .223+row*.013+.015*abs(column), z))
        guide1 = start + Vector((x*.046,.072,-.059))
        guide2 = Vector((finish.x*.64,finish.y-.044,finish.z+.064))
        path = []
        for j in range(17):
            t = j/16
            point = cubic(start,guide1,guide2,finish,t)
            point.x += .029*math.sin(t*math.tau+column*2.3+row)*math.sin(math.pi*t)
            normal = n.lerp(Vector((x*.6,1,0)).normalized(),t).normalized()
            path.append((point,normal))
        add_lock(path, rng.uniform(.018,.029), rng.uniform(.007,.012), rng.randrange(1,7))

# A few loose front strands curl down over the temples.
for i, (phi, dx, z) in enumerate([(-.39,-.018,1.59),(-.52,-.044,1.615),(-.30,.000,1.62),(.48,.028,1.653)]):
    normal = polar(.93,phi)
    start = crown(normal) + normal*.029
    finish = Vector((start.x+dx, -.255+abs(start.x)*.18, z))
    guide1 = start + Vector((-.027,-.066,.012))
    guide2 = finish + Vector((-.017,-.022,.055))
    path = [(cubic(start,guide1,guide2,finish,j/17), normal) for j in range(18)]
    add_lock(path, .012-i*.001, .006, 4+i%3)

hair_data = bpy.data.meshes.new('Wavy mullet')
hair_data.from_pydata([to_mesh @ vertex for vertex in verts], [], faces)
hair_data.update()
hair = bpy.data.objects.new('Wavy mullet', hair_data)
bpy.context.collection.objects.link(hair)
hair.parent = rig
hair.matrix_world = to_model
for i, color in enumerate([
    (.006,.005,.006),(.008,.007,.008),(.011,.010,.011),(.015,.014,.016),
    (.020,.018,.021),(.025,.023,.026),(.034,.032,.036),
]):
    mat = bpy.data.materials.new(f'Black hair {i+1}')
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .47+i*.010
    hair_data.materials.append(mat)
for polygon, slot in zip(hair_data.polygons, slots):
    polygon.material_index = slot
    polygon.use_smooth = True
head_group = hair.vertex_groups.new(name='mixamorig:Head')
head_group.add(list(range(len(verts))), 1, 'REPLACE')
deform = hair.modifiers.new('Armature', 'ARMATURE')
deform.object = rig
meshes.append(hair)

clips = {}
for label, filename in [
    ('Idle','Idle.fbx'), ('Run','Running(1).fbx'),
    ('Jump','jump.fbx'), ('Slide','Running Slide.fbx'),
    ('Roll','Sprinting Forward Roll.fbx'), ('Stumble','Jogging Stumble.fbx'),
    ('HeadHit','Hit To Head.fbx'), ('Fall','Fall Flat.fbx'),
]:
    skeleton, objects = import_fbx(filename)
    assert set(skeleton.data.bones.keys()) == set(rig.data.bones.keys())
    root = skeleton.pose.bones['mixamorig:Hips']
    action = skeleton.animation_data.action
    first, last = map(int, action.frame_range)
    scene.frame_set(first)
    start = root.head.copy()
    scene.frame_set((first + last) // 2)
    jump_lift = root.head.y - start.y if label == 'Jump' else 0
    baked = bpy.data.actions.new(label)
    rig.animation_data_create().action = baked
    previous_quaternions = {}
    for frame in range(first,last+1):
        scene.frame_set(frame)
        offset = Vector((0,0,0))
        if label in ('Slide','Jump','Roll','Stumble','HeadHit','Fall'):
            offset.x = root.head.x - start.x
            offset.z = root.head.z - start.z
        if label == 'Jump':
            offset.y = jump_lift * math.sin(math.pi*(frame-first)/(last-first))
        poses = {}
        for pose in rig.pose.bones:
            animated = skeleton.pose.bones[pose.name]
            target = animated.matrix @ animated.bone.matrix_local.inverted() @ pose.bone.matrix_local
            target.translation -= offset
            parent = pose.parent
            args = {'parent_matrix':poses[parent.name], 'parent_matrix_local':parent.bone.matrix_local} if parent else {}
            local = pose.bone.convert_local_to_pose(target, pose.bone.matrix_local, invert=True, **args)
            position, rotation, scale = local.decompose()
            if pose.name in previous_quaternions:
                rotation.make_compatible(previous_quaternions[pose.name])
            previous_quaternions[pose.name] = rotation.copy()
            poses[pose.name] = target
            pose.location = position
            pose.rotation_mode = 'QUATERNION'
            pose.rotation_quaternion = rotation
            pose.scale = scale
            for key in ('location','rotation_quaternion','scale'):
                pose.keyframe_insert(key,frame=frame-first+1,group=pose.name)
    for curve in baked.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    clips[label] = (baked, last-first+1)
    rig.animation_data.action = None
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)

# Downsample embedded textures for mobile and share identical color images.
textures = {}
for mesh in meshes:
    for material in mesh.data.materials:
        if not material or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image:
                continue
            im = node.image
            key = (hashlib.sha256(im.packed_file.data).digest(), im.colorspace_settings.name) if im.packed_file else im.name
            if key in textures:
                node.image = textures[key]
                continue
            textures[key] = im
            if max(im.size) > 1024:
                factor = 1024/max(im.size)
                im.scale(*(round(n*factor) for n in im.size))
                im.pack()

rig.animation_data.action = clips['Idle'][0]
scene.frame_set(1)
graph = bpy.context.evaluated_depsgraph_get()
coords = [o.matrix_world @ v.co for mesh in meshes for o in [mesh.evaluated_get(graph)] for v in o.data.vertices]
ground = min(v.z for v in coords)
height = max(v.z for v in coords) - ground
print('IDLE_BOUNDS', ground, height, flush=True)
for label in ('Roll', 'Fall'):
    clip, end = clips[label]
    rig.animation_data.action = clip
    hips = rig.pose.bones['mixamorig:Hips']
    world_to_hips = (rig.matrix_world @ hips.bone.matrix_local).to_3x3().inverted()
    for frame in range(1, end + 1):
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        minimum = min((obj.matrix_world @ vertex.co).z for mesh in meshes
                      for obj in [mesh.evaluated_get(graph)] for vertex in obj.data.vertices)
        if minimum < ground - .025:
            hips.location += world_to_hips @ Vector((0, 0, ground - .025 - minimum))
            hips.keyframe_insert('location', frame=frame, group=hips.name)

rig.animation_data.action = None
rig.location.z -= ground
for pose in rig.pose.bones:
    pose.matrix_basis = Matrix.Identity(4)
for label, (clip, end) in clips.items():
    track = rig.animation_data.nla_tracks.new()
    track.name = label
    track.strips.new(label, 1, clip)
scene.render.fps = 30
scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
    export_animation_mode='NLA_TRACKS', export_optimize_animation_size=True,
    export_image_format='AUTO', export_yup=True)
