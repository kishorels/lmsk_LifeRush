import bpy,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
model,out=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
actions={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks}
rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False
s.render.resolution_x=480;s.render.resolution_y=640;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Sky');s.world.color=(.5,.5,.5)
bpy.ops.object.camera_add(location=(2,-4,2));s.camera=bpy.context.object;s.camera.rotation_euler=(Vector((0,0,.95))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.type='ORTHO';s.camera.data.ortho_scale=2.3
bpy.ops.object.light_add(type='AREA',location=(0,-3,4));bpy.context.object.data.energy=400;bpy.context.object.data.size=4;bpy.context.object.rotation_euler=(Vector((0,0,1))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
print('ACTIONS',list(actions))
rig.animation_data_create()
for name in ['Run','Slide','Roll']:
    act=actions[name];rig.animation_data.action=act;s.frame_set(int(sum(act.frame_range)/2))
    s.render.filepath=str(Path(out)/('schoolboy-'+name+'.png'));bpy.ops.render.render(write_still=True)
