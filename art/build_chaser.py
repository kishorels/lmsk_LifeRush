"""Run with Blender, opening art/runverse-male.blend first."""
import bpy
import sys

rig = bpy.data.objects['Runverse_Male_Rig']
rig.name = 'Coast_Guard_Rig'
parts = [obj for obj in rig.children if obj.type == 'MESH']
for obj in list(bpy.data.objects):
    if obj != rig and obj not in parts:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in parts.copy():
    if obj.name.startswith(('Swept hair lock', 'Lace ', 'Pupil glint')):
        bpy.data.objects.remove(obj, do_unlink=True)
        parts.remove(obj)

def paint(name, color):
    material = bpy.data.materials[name]
    material.diffuse_color = (*color, 1)
    material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*color, 1)
    return material

yellow = paint('Teal jacket', (.94, .51, .034))
navy = paint('Ivory cotton', (.033, .056, .095))
paint('Navy joggers', (.023, .034, .057))
paint('Coral accents', (.04, .06, .095))
silver = paint('White soles', (.53, .57, .59))

def uniform_detail(name, position, scale, material, bone, shape='sphere'):
    if shape == 'sphere':
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=position)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if shape == 'sphere':
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    obj.parent = rig
    obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Rig', 'ARMATURE')
    modifier.object = rig
    parts.append(obj)

uniform_detail('Cap crown', (0,-.014,1.853), (.132,.112,.079), navy, 'head')
uniform_detail('Cap bill', (0,.104,1.822), (.133,.12,.014), navy, 'head')
uniform_detail('Cap insignia', (0,.092,1.871), (.028,.010,.024), yellow, 'head')
uniform_detail('Back uniform panel', (0,-.114,1.36), (.169,.035,.125), yellow, 'chest')
uniform_detail('Reflective back strip', (0,-.15,1.36), (.123,.009,.019), silver, 'chest', 'box')
uniform_detail('Front badge', (.102,.136,1.394), (.03,.007,.034), silver, 'chest', 'box')

rig.animation_data.action = None
for track in list(rig.animation_data.nla_tracks):
    if track.name in ('Run', 'Idle'):
        track.mute = False
    else:
        rig.animation_data.nla_tracks.remove(track)
for action in list(bpy.data.actions):
    if action.name not in ('Run', 'Idle'):
        bpy.data.actions.remove(action)

# Bake fabric modifiers before merging the skinned parts to reduce draw calls.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        if modifier.type != 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
bpy.context.object.name = 'Security guard'

bpy.context.scene.frame_set(1)
output = sys.argv[sys.argv.index('--')+1]
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB',
                         export_animation_mode='NLA_TRACKS',
                         export_optimize_animation_size=True)
