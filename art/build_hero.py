import bpy, math, os, json
from mathutils import Vector, Quaternion
from math import sin,cos,pi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c,rough=.6):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;return m
skin=material('Warm brown skin',(.47,.235,.125));teal=material('Teal jacket',(.025,.23,.25));trim=material('Jacket seams',(.018,.13,.15));ivory=material('Ivory cotton',(.88,.86,.76));navy=material('Navy joggers',(.025,.038,.075));sole=material('White soles',(.93,.92,.87));coral=material('Coral accents',(.83,.19,.13));hair=material('Black textured hair',(.018,.014,.012));eye=material('Dark brown eyes',(.04,.021,.012),.3);white=material('Eye whites',(.85,.82,.73));lips=material('Natural lips',(.32,.12,.08));steel=material('Zipper',(.34,.42,.42),.32)
parts=[]
bones={
'hips':((0,0,.92),(0,0,1.08),None),'spine':((0,0,1.08),(0,0,1.3),'hips'),'chest':((0,0,1.3),(0,0,1.49),'spine'),'neck':((0,0,1.49),(0,0,1.6),'chest'),'head':((0,0,1.6),(0,0,1.86),'neck')}
for side,sgn in [('L',1),('R',-1)]:
 bones['thigh'+side]=((sgn*.105,0,.94),(sgn*.105,.015,.53),'hips');bones['shin'+side]=((sgn*.105,.015,.53),(sgn*.105,0,.12),'thigh'+side);bones['foot'+side]=((sgn*.105,0,.12),(sgn*.105,.16,.075),'shin'+side)
 bones['upper'+side]=((sgn*.235,0,1.46),(sgn*.325,.005,1.17),'chest');bones['fore'+side]=((sgn*.325,.005,1.17),(sgn*.365,.03,.94),'upper'+side);bones['hand'+side]=((sgn*.365,.03,.94),(sgn*.38,.04,.82),'fore'+side)
def attach(o,weights):
 for b,w in weights.items():
  vg=o.vertex_groups.new(name=b)
  if isinstance(w,(float,int)):vg.add(list(range(len(o.data.vertices))),w,'REPLACE')
  else:
   for i,v in enumerate(w):
    if v>0:vg.add([i],float(v),'REPLACE')
 parts.append(o);return o
def ell(name,loc,scale,mat,bone,rot=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
 if rot:o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return attach(o,{bone:1})
def surface(name,rings,mat,bone_fn,sides=24):
 # rings: x,y,z, radius-x,radius-y; true connected ring topology
 verts=[];faces=[];weights={}
 for j,(x,y,z,rx,ry) in enumerate(rings):
  for k in range(sides):
   a=2*pi*k/sides;verts.append((x+rx*cos(a),y+ry*sin(a),z))
   wd=bone_fn(j,len(rings))
   for bn in set(weights)|set(wd):weights.setdefault(bn,[0]*(len(verts)-1)).append(wd.get(bn,0))
 for j in range(len(rings)-1):
  for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+k for k in range(sides))])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 attach(o,weights);return o
def fixed(b):return lambda j,n:{b:1}
def limb(name,start,mid,end,radii,mat,upper,lower):
 pts=[]
 for i in range(17):
  t=i/16
  if t<=.5:p=Vector(start).lerp(Vector(mid),t*2)
  else:p=Vector(mid).lerp(Vector(end),(t-.5)*2)
  q=t*4;idx=min(3,int(q));r=radii[idx]*(1-(q-idx))+radii[idx+1]*(q-idx);pts.append((*p,r,r*.86))
 def weight(i,n):t=i/(n-1);v=max(0,min(1,(t-.35)/.30));return {upper:1-v,lower:v}
 return surface(name,pts,mat,weight,20)
# Continuous torso with jacket shell and cotton inset.
surface('Cotton T-shirt',[(0,0,.98,.15,.10),(0,0,1.06,.17,.11),(0,0,1.18,.17,.105),(0,0,1.33,.21,.125),(0,0,1.43,.235,.12),(0,0,1.5,.17,.09),(0,0,1.53,.08,.073)],ivory,lambda i,n:{'hips':1} if i<2 else {'spine':1} if i<4 else {'chest':1})
# Open jacket panels are a custom partial elliptical surface.
for side,sgn in [('L',1),('R',-1)]:
 rings=[(.99,.165,.114),(1.06,.18,.125),(1.2,.182,.12),(1.35,.222,.14),(1.44,.244,.134),(1.5,.165,.11)]
 vs=[];fs=[]
 for z,rx,ry in rings:
  for k in range(19):
   a=(-pi/2+.07)+(pi-.48)*k/18;vs.append((sgn*rx*cos(a),ry*sin(a),z))
 for j in range(len(rings)-1):
  for k in range(18):a=j*19+k;fs.append((a,a+1,a+20,a+19) if sgn==1 else (a+19,a+20,a+1,a))
 me=bpy.data.meshes.new('Jacket panel');me.from_pydata(vs,[],fs);o=bpy.data.objects.new('Open jacket '+side,me);bpy.context.collection.objects.link(o);me.materials.append(teal)
 for p in me.polygons:p.use_smooth=True
 weights={b:[0]*len(vs) for b in ['hips','spine','chest']}
 for i,v in enumerate(vs):weights['hips' if v[2]<1.1 else 'spine' if v[2]<1.32 else 'chest'][i]=1
 attach(o,weights);sol=o.modifiers.new('Fabric thickness','SOLIDIFY');sol.thickness=.008
 # sleeve arm shares upper arm bone, overlaps jacket shoulder naturally
 ell('Tailored shoulder '+side,(sgn*.215,0,1.452),(.086,.092,.071),teal,'chest');
 start=bones['upper'+side][0];mid=bones['fore'+side][0];end=bones['hand'+side][0]
 limb('Continuous arm '+side,start,mid,end,[.078,.074,.057,.054,.037],skin,'upper'+side,'fore'+side)
 p=Vector(start);m=Vector(mid);sleeve=[(*p.lerp(m,t),.086-t*.025,.079-t*.023) for t in [0,.12,.3,.48]]
 surface('Jacket sleeve '+side,sleeve,teal,fixed('upper'+side),20)
 ell('Palm '+side,(sgn*.376,.031,.893),(.046,.031,.065),skin,'hand'+side)
 # Five fingers, attached to palm; relaxed hands.
 for j in range(4):
  ell('Finger '+side+str(j),(sgn*(.347+j*.018),.04,.832-(.01 if j in [1,2] else 0)),(.011,.014,.044),skin,'hand'+side)
 ell('Thumb '+side,(sgn*.332,.062,.884),(.018,.019,.039),skin,'hand'+side,rot=(0,sgn*.45,0))
 limb('Jogger leg '+side,bones['thigh'+side][0],bones['shin'+side][0],bones['foot'+side][0],[.097,.09,.066,.064,.046],navy,'thigh'+side,'shin'+side)
 ell('Sneaker sole '+side,(sgn*.105,.075,.047),(.071,.155,.034),sole,'foot'+side)
 ell('Sneaker upper '+side,(sgn*.105,.066,.09),(.066,.135,.054),ivory,'foot'+side)
 ell('Heel accent '+side,(sgn*.105,-.038,.105),(.067,.023,.043),coral,'foot'+side)
 for j in range(4):ell('Lace '+side+str(j),(sgn*.105,.065+j*.017,.139-j*.004),(.04,.004,.004),sole,'foot'+side)
 # natural ears
 ell('Ear '+side,(sgn*.125,.0,1.713),(.018,.017,.035),skin,'head')
# Pelvis overlaps continuous thigh mesh inside pants.
ell('Jogger pelvis',(0,-.003,.956),(.185,.115,.15),navy,'hips')
surface('Neck',[(0,0,1.48,.065,.064),(0,0,1.57,.061,.06),(0,0,1.63,.065,.065)],skin,fixed('neck'))
# Human shaped head with jaw, cheekbones, forehead and rounded crown.
headrings=[(0,.012,1.585,.052,.056),(0,.024,1.61,.076,.075),(0,.021,1.645,.096,.09),(0,.006,1.69,.114,.104),(0,0,1.74,.12,.104),(0,-.005,1.79,.12,.099),(0,-.008,1.835,.108,.087),(0,-.01,1.87,.065,.055),(0,-.01,1.883,.009,.009)]
surface('Sculpted head',headrings,skin,fixed('head'),32)
ell('Nose bridge',(0,.103,1.716),(.019,.027,.044),skin,'head');ell('Nose tip',(0,.13,1.693),(.024,.025,.017),skin,'head')
for sgn in [-1,1]:
 ell('Eye socket',(sgn*.047,.097,1.735),(.036,.012,.019),skin,'head');ell('Eye white',(sgn*.047,.107,1.736),(.021,.004,.008),white,'head');ell('Iris',(sgn*.047,.111,1.737),(.008,.003,.008),eye,'head');ell('Pupil glint',(sgn*.044,.115,1.741),(.003,.002,.003),sole,'head')
 ell('Eyebrow',(sgn*.047,.11,1.762),(.03,.008,.006),hair,'head',rot=(0,sgn*.08,0))
ell('Upper lip',(0,.111,1.658),(.035,.009,.006),lips,'head');ell('Lower lip',(0,.111,1.648),(.031,.008,.006),skin,'head')
# Hair scalp fitted tightly and layered swept locks, not a cap.
surface('Hair fitted sides',[(0,-.026,1.74,.116,.077),(0,-.017,1.79,.126,.102),(0,-.014,1.85,.12,.098),(0,-.015,1.89,.086,.075),(0,-.015,1.91,.015,.02)],hair,fixed('head'),32)
for i in range(10):
 x=-.1+i*.021;ell('Swept hair lock '+str(i),(x,.035+sin(i)*.01,1.875+(.02 if i<4 else 0)),(.041,.081,.032),hair,'head',rot=(.2,-.35,0))
# Consistent surface winding.
for o in parts:
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
# Armature and weighted geometry.
bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='Runverse_Male_Rig';rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(a,b,parent) in bones.items():
 bone=rig.data.edit_bones.new(name);bone.head=a;bone.tail=b
 if parent:bone.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in parts:
 o.parent=rig;mod=o.modifiers.new('Connected skeleton','ARMATURE');mod.object=rig
# Keyframed skeletal clips. Rest-space converted rotations keep anatomical axes consistent.
def pose(name,deg):
 b=rig.pose.bones[name];q=b.bone.matrix_local.to_quaternion();b.rotation_mode='QUATERNION';b.rotation_quaternion=q.inverted() @ Quaternion((1,0,0),math.radians(deg)) @ q

def reset():
 for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0)
def key(frame):
 for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('location',frame=frame)
clips=[]
for name,length in [('Idle',48),('Run',24),('Jump',28),('Slide',24),('Stumble',18)]:
 rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(name)
 for frame in range(1,length+1):
  reset();t=(frame-1)/(length-1)
  if name=='Idle':pose('chest',sin(t*2*pi)*1);pose('foreL',-8);pose('foreR',-8)
  if name=='Run':
   phase=t*2*pi;pose('spine',-7);pose('chest',-3)
   for side,ph in [('L',phase),('R',phase+pi)]:
    pose('thigh'+side,-sin(ph)*36);pose('shin'+side, -(max(0,sin(ph+.5))*66+10));pose('foot'+side,max(0,sin(ph+.5))*25);pose('upper'+side,sin(ph)*28);pose('fore'+side,65)
   rig.pose.bones['hips'].location.y=.025*abs(sin(phase))
  if name=='Jump':
   tuck=sin(pi*t);pose('thighL',35*tuck);pose('thighR',43*tuck);pose('shinL',-65*tuck);pose('shinR',-76*tuck);pose('upperL',85*tuck);pose('upperR',75*tuck);pose('foreL',40);pose('foreR',40);pose('spine',-9*tuck)
  if name=='Slide':
   blend=min(1,t*6,(1-t)*6);rig.pose.bones['hips'].location.y=-.42*blend;pose('thighL',68*blend);pose('thighR',78*blend);pose('shinL',-112*blend);pose('shinR',-124*blend);pose('spine',-38*blend);pose('chest',-12*blend);pose('neck',22*blend);pose('upperL',35*blend);pose('upperR',35*blend);pose('foreL',65*blend);pose('foreR',65*blend)
  if name=='Stumble':pose('spine',-25*sin(pi*t));pose('upperL',-55*sin(pi*t));pose('upperR',-55*sin(pi*t));pose('foreL',-50);pose('foreR',-50)
  bpy.context.view_layer.update()
  dg=bpy.context.evaluated_depsgraph_get();bottom=10
  for o in parts:
   if o.name.startswith('Sneaker sole'):
    ev=o.evaluated_get(dg);bottom=min(bottom,min((ev.matrix_world@v.co).z for v in ev.data.vertices))
  rig.pose.bones['hips'].location.y += .025-bottom
  key(frame)
 act=rig.animation_data.action;act.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,act);track.mute=True;clips.append(act)
rig.animation_data.action=None;reset()
bpy.context.scene.render.fps=30
# Export actual rig + animations, excluding stage.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
os.makedirs(ROOT+'/dist/assets',exist_ok=True)
bpy.ops.export_scene.gltf(filepath=ROOT+'/dist/assets/runverse-male.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_materials='EXPORT',export_skins=True)
# Studio preview scene, inspect actual geometry rather than an AI picture.
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview stage';floor.data.materials.append(material('Stage',(.12,.17,.2)))
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.39,.44,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
for loc,power,size in [((3,4,5),550,4),((-3,2,3),400,3),((0,-3,4),650,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,5,2.5));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.25;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=False;sc.render.resolution_x=640;sc.render.resolution_y=800;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG'
rig.animation_data.action=clips[0];sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/runverse-male.blend')
sc.render.filepath=ROOT+'/dist/assets/male-preview.png';bpy.ops.render.render(write_still=True)
for name,frame in [('Run',7),('Slide',12),('Jump',14)]:
 rig.animation_data.action=next(a for a in clips if a.name==name);sc.frame_set(frame);sc.render.filepath=ROOT+'/art/'+name.lower()+'.png';bpy.ops.render.render(write_still=True)
print('HERO_EXPORT_COMPLETE')
