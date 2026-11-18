"""blender -b -P export_run.py -- running.fbx run.glb"""
import bpy
import sys
source,target=sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
clip=rig.animation_data.action
clip.name='Run'
scene=bpy.context.scene
scene.frame_start,scene.frame_end=map(int,clip.frame_range)
scene.frame_set(scene.frame_start)
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',export_frame_range=True)
