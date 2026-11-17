import bpy
import hashlib
import math
import sys
from pathlib import Path
from mathutils import Vector

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
clips = {}
for label, filename in [
    ('Idle','Idle.fbx'), ('Run','Running(1).fbx'),
    ('Jump','jump.fbx'), ('Slide','Running Slide.fbx'),
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
        if label in ('Slide','Jump'):
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
rig.animation_data.action = None
rig.location.z -= ground
for pose in rig.pose.bones:
    from mathutils import Matrix
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
