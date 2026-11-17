"""Export the skinned Mutant and two in-place clips with Blender."""
import bpy
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

run_file, idle_file, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def import_fbx(path):
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()))
    objects = set(bpy.data.objects) - existing
    return next(obj for obj in objects if obj.type == 'ARMATURE'), objects

rig, model = import_fbx(run_file)
skins = [obj for obj in model if obj.type == 'MESH']
if not skins:
    raise ValueError('The running FBX must be exported with skin')

def bake(source, label):
    if set(source.data.bones.keys()) != set(rig.data.bones.keys()):
        raise ValueError(f'{label} skeleton does not match the character')
    action = source.animation_data.action
    first, last = map(int, action.frame_range)
    hips = next(b for b in source.pose.bones if b.name.endswith(':Hips'))
    scene.frame_set(first)
    origin = source.matrix_world @ hips.head
    scene.frame_set(last)
    displacement = (source.matrix_world @ hips.head) - origin
    displacement.z = 0
    if label == 'Idle':
        displacement *= 0
    to_local = rig.matrix_world.to_3x3().inverted()
    offset = origin.copy()
    offset.z = 0
    source_to_rig = rig.matrix_world.inverted() @ source.matrix_world
    source_rests = {bone.name: bone.matrix_local.inverted() for bone in source.data.bones}
    samples = []
    previous_rotations = {}
    for frame in range(first, last + 1):
        scene.frame_set(frame)
        correction = to_local @ (offset + displacement * ((frame-first)/(last-first)))
        matrices = {}
        sample = {}
        for pose in rig.pose.bones:
            animated = source.pose.bones[pose.name]
            target = source_to_rig @ animated.matrix @ source_rests[pose.name] @ pose.bone.matrix_local
            target.translation -= correction
            parent = pose.parent
            args = {'parent_matrix': matrices[parent.name], 'parent_matrix_local': parent.bone.matrix_local} if parent else {}
            basis = pose.bone.convert_local_to_pose(target, pose.bone.matrix_local, invert=True, **args)
            position, rotation, scale = basis.decompose()
            if pose.name in previous_rotations:
                rotation.make_compatible(previous_rotations[pose.name])
            previous_rotations[pose.name] = rotation.copy()
            matrices[pose.name] = target
            sample[pose.name] = (position, rotation, scale)
        samples.append(sample)

    clip = bpy.data.actions.new(label)
    rig.animation_data.action = clip
    for frame, sample in enumerate(samples, start=1):
        for pose in rig.pose.bones:
            pose.rotation_mode = 'QUATERNION'
            pose.location, pose.rotation_quaternion, pose.scale = sample[pose.name]
            for prop in ('location', 'rotation_quaternion', 'scale'):
                pose.keyframe_insert(prop, frame=frame, group=pose.name)
    for curve in clip.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    rig.animation_data.action = None
    return clip

run = bake(rig, 'Run')
idle_rig, idle_objects = import_fbx(idle_file)
idle = bake(idle_rig, 'Idle')
for obj in idle_objects:
    bpy.data.objects.remove(obj, do_unlink=True)

# Preserve diffuse detail with JPEG and keep the data texture lossless.
with TemporaryDirectory() as storage:
    for image in bpy.data.images:
        if not image.packed_file:
            continue
        color = image.colorspace_settings.name == 'sRGB'
        maximum = 1024 if color else 512
        if max(image.size) > maximum:
            factor = maximum / max(image.size)
            image.scale(*(round(size*factor) for size in image.size))
        if color:
            target = Path(storage) / f'{image.name}.jpg'
            image.file_format = 'JPEG'
            image.save(filepath=str(target), quality=87)
            image.filepath = target.name
            compressed = target.read_bytes()
            image.pack(data=compressed, data_len=len(compressed))
        else:
            image.pack()

rig.animation_data.action = idle
scene.frame_set(1)
deps = bpy.context.evaluated_depsgraph_get()
ground = min((obj.matrix_world @ vertex.co).z
             for skin in skins for obj in [skin.evaluated_get(deps)] for vertex in obj.data.vertices)
rig.animation_data.action = None
rig.location.z -= ground
for clip in (run, idle):
    track = rig.animation_data.nla_tracks.new()
    track.name = clip.name
    track.strips.new(clip.name, 0, clip)
scene.render.fps = 30
scene.frame_set(0)
bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB',
    export_animation_mode='NLA_TRACKS', export_optimize_animation_size=True,
    export_image_format='AUTO')
