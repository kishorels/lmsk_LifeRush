"""Fit the black/red reference uniform to the existing animated schoolgirl.

python art/dress_schoolgirl.py [source.glb] [output.glb]
The GLB retains its original source document/data for deterministic rebuilds.
Requires numpy, scipy and Pillow; no animation clips or facial assets are replaced.
"""
import copy
import io
import json
import math
from pathlib import Path
import struct
import sys

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist/assets/schoolgirl.glb'
target = Path(sys.argv[2]) if len(sys.argv) > 2 else source
raw = source.read_bytes()
json_size = struct.unpack_from('<I', raw, 12)[0]
document = json.loads(raw[20:20 + json_size])
base = document.get('asset', {}).get('extras', {}).get('uniformSourceDocument', document)
g = copy.deepcopy(base)
data = bytearray(raw[28 + json_size:28 + json_size + base['buffers'][0]['byteLength']])


def read(index):
    a = g['accessors'][index]
    view = g['bufferViews'][a['bufferView']]
    size = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dtype = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}[a['componentType']]
    return np.frombuffer(data, dtype, count=a['count'] * size,
                         offset=view.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, size).copy()


def buffer_view(binary):
    data.extend(b'\0' * (-len(data) % 4))
    index = len(g['bufferViews'])
    g['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(binary)})
    data.extend(binary)
    return index


def accessor(values, kind=None):
    a = np.asarray(values)
    integer = a.dtype.kind in 'iu'
    a = np.asarray(a, dtype='<u2' if integer and (a.size == 0 or a.max() < 65536) else '<u4' if integer else '<f4')
    if a.ndim == 1:
        a = a.reshape(-1, 1)
    view = buffer_view(a.tobytes())
    result = {'bufferView': view, 'componentType': 5123 if a.dtype == np.dtype('<u2') else 5125 if integer else 5126,
              'count': len(a), 'type': kind or {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[a.shape[1]]}
    if len(a):
        result.update(min=a.min(0).tolist(), max=a.max(0).tolist())
    g['accessors'].append(result)
    return len(g['accessors']) - 1


def normals(vertices, triangles):
    v, f = np.asarray(vertices), np.asarray(triangles, dtype=int)
    n = np.zeros_like(v, dtype=float)
    cross = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for corner in range(3):
        np.add.at(n, f[:, corner], cross)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-10)


def texture(image):
    encoded = io.BytesIO()
    image.save(encoded, format='PNG')
    g.setdefault('images', []).append({'bufferView': buffer_view(encoded.getvalue()), 'mimeType': 'image/png'})
    g.setdefault('samplers', []).append({'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497})
    g.setdefault('textures', []).append({'source': len(g['images']) - 1, 'sampler': len(g['samplers']) - 1})
    return len(g['textures']) - 1


# A small repeating woven normal map supplies fibre highlights, not painted folds.
y, x = np.mgrid[:64, :64]
height_map = np.sin(x * math.tau / 8) * np.sin(y * math.tau / 8)
dy, dx = np.gradient(height_map)
n = np.stack([-dx * .16, -dy * .16, np.ones_like(dx)], axis=-1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
weave = texture(Image.fromarray(np.uint8((n * .5 + .5) * 255)))
g.setdefault('extensionsUsed', [])
for extension in ['KHR_materials_sheen', 'KHR_texture_transform']:
    if extension not in g['extensionsUsed']:
        g['extensionsUsed'].append(extension)


def material(name, color, roughness=.78, metallic=0, fabric=False):
    m = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': [*color, 1],
         'metallicFactor': metallic, 'roughnessFactor': roughness}, 'doubleSided': True}
    if fabric:
        m['normalTexture'] = {'index': weave, 'scale': .45,
                             'extensions': {'KHR_texture_transform': {'scale': [32, 32]}}}
        m['extensions'] = {'KHR_materials_sheen': {'sheenColorFactor': [c * .35 for c in color], 'sheenRoughnessFactor': .7}}
    g['materials'].append(m)
    return len(g['materials']) - 1


black = material('Uniform | charcoal woven wool', [.013, .015, .019], fabric=True)
red = material('Uniform | crimson satin trim', [.57, .012, .018], .42, fabric=True)
seam = material('Uniform | tailored raised seams', [.025, .028, .034], .8, fabric=True)
silver = material('Uniform | brushed silver buttons', [.82, .84, .87], .28, .35)
knot = material('Uniform | ivory bow clasp', [.85, .86, .84], .37, .15)
leather = material('Uniform | black school shoes', [.012, .016, .021], .38)

# The old alpha-card hair intersects the opaque crown and creates upright,
# see-through spikes at the temples. Use the opaque swept scalp and braid.
# Fine fibre shading replaces thick raised comb spokes.
hy,hx=np.mgrid[:256,:512]
flow=np.sin(hx*math.tau*64/512+np.sin(hy/256*math.tau)*1.3)*.55
flow+=np.sin(hx*math.tau*233/512+hy*.015)*.2
flow+=np.sin(hx*math.tau*349/512-hy*.01)*.12
colour=np.clip(np.array([56,35,22])[None,None,:]*(1+flow[:,:,None]*.18),0,255).astype('uint8')
hair_colour=texture(Image.fromarray(colour))
dy,dx=np.gradient(flow)
hn=np.stack([-dx*.10,-dy*.10,np.ones_like(dx)],axis=-1)
hn/=np.linalg.norm(hn,axis=-1,keepdims=True)
hair_normal=texture(Image.fromarray(np.uint8((hn*.5+.5)*255)))
hair=material('Hair | natural dark brown',[1,1,1],.64)
hair_shadow=material('Hair | braid shadow',[.8,.8,.8],.67)
for slot in [hair,hair_shadow]:
    g['materials'][slot]['pbrMetallicRoughness']['baseColorTexture']={'index':hair_colour}
    g['materials'][slot]['normalTexture']={'index':hair_normal,'scale':.55}
    g['materials'][slot]['alphaMode']='OPAQUE'

hair_joint_ids={g['nodes'][n]['name'].replace('mixamorig:',''):i for i,n in enumerate(g['skins'][0]['joints'])}
def hair_primitive(points,faces,uv,slot,braid=False):
    points=np.asarray(points);joints=np.zeros((len(points),4),dtype=np.uint16);weights=np.zeros((len(points),4))
    joints[:,0]=hair_joint_ids['Head'];joints[:,1]=hair_joint_ids['Spine2']
    weights[:,0]=np.clip((points[:,1]-1.32)/.24,0,1) if braid else 1
    weights[:,1]=1-weights[:,0]
    return {'attributes':{'POSITION':accessor(points),'NORMAL':accessor(normals(points,faces)),
        'TEXCOORD_0':accessor(uv),'JOINTS_0':accessor(joints),'WEIGHTS_0':accessor(weights)},
        'indices':accessor(np.asarray(faces,dtype=int).reshape(-1)),'material':slot}

for node in g['nodes']:
    if 'mesh' not in node:continue
    name=node.get('name','');primitives=g['meshes'][node['mesh']]['primitives']
    pearl=all(g['materials'][p.get('material',0)].get('name')=='Pearl pins' for p in primitives)
    if name=='Ch02_Hair' or name.startswith(('Swept crown twist','Strand glint','Crown comb line')) or pearl:
        node.pop('mesh',None);node.pop('skin',None);continue
    if name=='Ash blonde crown':
        # Fit hair directly to the real cranial surface. A separate ellipsoid
        # creates an oversized helmet and an unnaturally straight fringe.
        body_node=next(n for n in g['nodes'] if n.get('name')=='Ch02_Body')
        body=g['meshes'][body_node['mesh']]['primitives'][0]
        columns={name:read(index) for name,index in body['attributes'].items()}
        positions=columns['POSITION'];faces=read(body['indices']).reshape(-1,3)
        front=np.clip((positions[:,2]+.015)/.105,-1,1)
        line=1.645+.060*np.maximum(front,0)-.075*np.maximum(-front,0)
        distance=positions[:,1]-line
        ears=(abs(positions[:,0])>.087)&(positions[:,1]<1.69)
        distance[ears]=-abs(distance[ears])-.002
        values={name:list(array) for name,array in columns.items()};distance=list(distance);cuts={}
        def cut(a,b):
            key=(min(a,b),max(a,b))
            if key in cuts:return cuts[key]
            if abs(distance[a])<1e-9:return a
            if abs(distance[b])<1e-9:return b
            t=distance[a]/(distance[a]-distance[b]);index=len(distance)
            for name in values:
                if name in ['JOINTS_0','WEIGHTS_0']:continue
                value=columns[name][a]*(1-t)+columns[name][b]*t
                if name=='NORMAL':value=value/max(np.linalg.norm(value),1e-8)
                values[name].append(value)
            influence={}
            for vertex,blend in [(a,1-t),(b,t)]:
                for joint,weight in zip(columns['JOINTS_0'][vertex],columns['WEIGHTS_0'][vertex]):
                    influence[int(joint)]=influence.get(int(joint),0)+float(weight)*blend
            ranked=sorted(influence.items(),key=lambda item:-item[1])[:4]
            ranked+= [(0,0)]*(4-len(ranked));total=sum(w for _,w in ranked)
            values['JOINTS_0'].append([j for j,_ in ranked]);values['WEIGHTS_0'].append([w/total for _,w in ranked])
            distance.append(0);cuts[key]=index;return index
        scalp_faces=[];skin_faces=[]
        for face in faces:
            for positive,result in [(True,scalp_faces),(False,skin_faces)]:
                polygon=[]
                for a,b in zip(face,np.roll(face,-1)):
                    ina=distance[a]>=0 if positive else distance[a]<=0
                    inb=distance[b]>=0 if positive else distance[b]<=0
                    if ina:polygon.append(int(a))
                    if ina!=inb:polygon.append(cut(int(a),int(b)))
                for i in range(1,len(polygon)-1):result.append([polygon[0],polygon[i],polygon[i+1]])
        columns={name:np.asarray(array,dtype=np.uint16 if name=='JOINTS_0' else float) for name,array in values.items()}
        body['attributes']={name:accessor(array) for name,array in columns.items()}
        body['indices']=accessor(np.asarray(skin_faces,dtype=int).reshape(-1))
        ids,indices=np.unique(np.asarray(scalp_faces).reshape(-1),return_inverse=True)
        normal=columns['NORMAL'][ids];points=columns['POSITION'][ids]+normal*.003
        phi=np.arctan2(-(points[:,2]+.015),points[:,0]);uv=np.stack([(phi+math.pi)/math.tau,(1.77-points[:,1])*5],axis=-1)
        attrs={'POSITION':accessor(points),'NORMAL':accessor(normal),'TEXCOORD_0':accessor(uv),
            'JOINTS_0':accessor(columns['JOINTS_0'][ids]),'WEIGHTS_0':accessor(columns['WEIGHTS_0'][ids])}
        g['meshes'][node['mesh']]['primitives']=[{'attributes':attrs,'indices':accessor(indices),'material':hair}]
        node['name']='Hair smooth swept crown'
    elif name.startswith('Interwoven lock'):
        strand=int(name.rsplit('.',1)[1]) if '.' in name else 0
        points=[];faces=[];uv=[];rows=56;columns=10
        for row in range(rows+1):
            t=row/rows;a=t*math.tau*2.65+strand*math.tau/3;taper=1-.58*t
            cx=.021*taper*math.sin(a);cy=1.61-.335*t;cz=-.137-.045*math.sin(t*math.pi*.65)+.009*taper*math.cos(a)
            radius=.014*taper
            for col in range(columns+1):
                angle=col/columns*math.tau
                points.append([cx+radius*math.cos(angle),cy,cz+radius*math.sin(angle)]);uv.append([col/columns,t*3])
                if row<rows and col<columns:
                    n=row*(columns+1)+col;faces.extend([(n,n+1,n+columns+1),(n+1,n+columns+2,n+columns+1)])
        g['meshes'][node['mesh']]['primitives']=[hair_primitive(points,faces,uv,hair_shadow if strand==2 else hair,True)]
        node['name']='Hair school braid '+str(strand)

cloth_node = next(node for node in g['nodes'] if node.get('name') == 'Ch02_Cloth')
cloth = g['meshes'][cloth_node['mesh']]['primitives'][0]
original = read(cloth['attributes']['POSITION'])
vertices = original.copy()
waist = np.exp(-((vertices[:, 1] - 1.1) / .11) ** 2) * np.clip(1 - (abs(vertices[:, 0]) / .25) ** 8, 0, 1)
waist *= vertices[:, 1] > 1.015
vertices[:, 0] *= 1 - .13 * waist
vertices[:, 2] *= 1 - .22 * waist
triangles = read(cloth['indices']).reshape(-1, 3)
attributes = dict(cloth['attributes'])
attributes['POSITION'] = accessor(vertices)
attributes['NORMAL'] = accessor(normals(vertices, triangles))
centre = vertices[triangles].mean(1)
cuffs = (abs(centre[:, 0]) > .616) & (abs(centre[:, 0]) < .649)
g['meshes'][cloth_node['mesh']]['primitives'] = [
    {'attributes': attributes, 'indices': accessor(triangles[~cuffs].reshape(-1)), 'material': black},
    {'attributes': attributes, 'indices': accessor(triangles[cuffs].reshape(-1)), 'material': red}]
cloth_node['name'] = 'Uniform fitted jacket and red cuffs'
for node in g['nodes']:
    if node.get('name') in ['Ch02_Sneakers', 'Ch02_Socks']:
        for p in g['meshes'][node['mesh']]['primitives']:
            p['material'] = leather

skin = g['skins'][cloth_node['skin']]
joint_ids = {g['nodes'][node]['name'].replace('mixamorig:', ''): i for i, node in enumerate(skin['joints'])}
skin_joints, skin_weights = read(cloth['attributes']['JOINTS_0']), read(cloth['attributes']['WEIGHTS_0'])
tree = cKDTree(vertices)
armature = next(node for node in g['nodes'] if node.get('name') == 'Armature')


def surface_z(px, py, front=True):
    near = vertices[(abs(vertices[:, 0] - px) < .027) & (abs(vertices[:, 1] - py) < .025)]
    if not len(near):
        near = vertices[tree.query([px, py, .1 if front else -.12], k=10)[1]]
    return float(near[:, 2].max() if front else near[:, 2].min())


def mesh(name, points, faces, mat, uv=None, joints=None, weights=None, targets=None, face_materials=None):
    points, faces = np.asarray(points, float), np.asarray(faces, dtype=int)
    if joints is None:
        _, closest = tree.query(points)
        joints, weights = skin_joints[closest], skin_weights[closest]
    if uv is None:
        uv = points[:, :2] * 4
    attrs = {'POSITION': accessor(points), 'NORMAL': accessor(normals(points, faces)),
             'TEXCOORD_0': accessor(uv), 'JOINTS_0': accessor(np.asarray(joints, dtype=np.uint16)), 'WEIGHTS_0': accessor(weights)}
    primitives = []
    for slot in sorted(set(face_materials)) if face_materials is not None else [mat]:
        chosen = faces[np.asarray(face_materials) == slot] if face_materials is not None else faces
        primitive = {'attributes': attrs, 'indices': accessor(chosen.reshape(-1)), 'material': int(slot)}
        if targets is not None:
            primitive['targets'] = [{'POSITION': accessor(target)} for target in targets]
        primitives.append(primitive)
    result = {'name': name, 'primitives': primitives}
    if targets is not None:
        result.update(weights=[0] * len(targets), extras={'targetNames': ['Cloth sway left', 'Cloth sway right']})
    g['meshes'].append(result)
    g['nodes'].append({'name': name, 'mesh': len(g['meshes']) - 1, 'skin': cloth_node['skin']})
    armature['children'].append(len(g['nodes']) - 1)
    return len(g['nodes']) - 1


# Sixteen sewn pleats. Red hem bands share the cloth's skin and morph targets.
points, uv, faces, slots, joints, weights, sway_left, sway_right = [], [], [], [], [], [], [], []
levels = sorted(set([i / 20 for i in range(21)] + [.80, .84, .90, .94]))
segments = 128
for t in levels:
    for col in range(segments + 1):
        theta = col / segments * math.tau
        wave = 2 * abs(2 * ((col / segments * 16) % 1) - 1) - 1
        fold = wave * t ** 1.2
        px = (.182 + .105 * t + .021 * fold) * math.sin(theta)
        pz = (.132 + .120 * t + .018 * fold) * math.cos(theta)
        py = 1.085 - .42 * t + .004 * math.cos(theta) * t
        points.append([px, py, pz]);uv.append([col / segments * 6, t * 3])
        leg = .65 * max(0, (t - .18) / .82)
        left = .5 + .5 * math.tanh(px / .055)
        joints.append([joint_ids['Hips'], joint_ids['LeftUpLeg'], joint_ids['RightUpLeg'], 0])
        weights.append([1 - leg, leg * left, leg * (1 - left), 0])
        sway_left.append([.015 * t*t, .004 * math.sin(theta*3) * t*t, .009 * math.cos(theta) * t*t])
        sway_right.append([-.015 * t*t, -.004 * math.sin(theta*3) * t*t, .009 * math.cos(theta) * t*t])
for row in range(len(levels) - 1):
    mid = (levels[row] + levels[row + 1]) / 2
    mat = red if .80 <= mid <= .84 or .90 <= mid <= .94 else black
    for col in range(segments):
        a = row * (segments + 1) + col;b = a + segments + 1
        faces.extend([(a, b, a+1), (a+1, b, b+1)]);slots.extend([mat, mat])
skirt_node = mesh('Uniform pleated skirt with twin red hem bands', points, faces, black, uv, joints, weights,
                  [sway_left, sway_right], slots)

# Folded bow lobes and separate draped tails, rather than flat decals.
for side in [-1, 1]:
    points, faces = [], []
    for row in range(13):
        v = row / 12 * 2 - 1
        for col in range(17):
            u = col / 16;px = side * (.009 + .108 * u)
            py = 1.437 + v * (.014 + .047 * math.sin(u * math.pi / 2)) + .009*u
            pz = surface_z(px, py) + .018 + .022 * math.sin(u*math.pi) * math.cos(v*math.pi/2) + .003*math.sin(v*math.pi*3)*u
            points.append([px, py, pz])
            if row < 12 and col < 16:
                a = row*17+col;faces.extend([(a,a+1,a+17), (a+1,a+18,a+17)])
    mesh('Uniform folded red bow '+str(side), points, faces, red)
    points, faces = [], []
    for row in range(17):
        t = row / 16
        for col in range(7):
            u = col / 6 * 2 - 1;px = side*(.012 + t*.035) + u*(.013+.013*t)
            py = 1.43 - .175*t + .013 * abs(u) * t**8
            pz = surface_z(px,py) + .022 + .013*math.sin(t*math.pi) + .004*math.sin(u*math.pi*2)*math.sin(t*math.pi)
            points.append([px,py,pz])
            if row<16 and col<6:
                a=row*7+col;faces.extend([(a,a+1,a+7), (a+1,a+8,a+7)])
    mesh('Uniform draped bow tail '+str(side),points,faces,red)


def ellipsoid(centre, size, longitude=16, latitude=8):
    points, faces = [], []
    for row in range(latitude+1):
        theta=row/latitude*math.pi
        for col in range(longitude+1):
            phi=col/longitude*math.tau
            points.append([centre[0]+size[0]*math.sin(theta)*math.cos(phi),
                           centre[1]+size[1]*math.cos(theta),centre[2]+size[2]*math.sin(theta)*math.sin(phi)])
            if row<latitude and col<longitude:
                a=row*(longitude+1)+col;faces.extend([(a,a+longitude+1,a+1),(a+1,a+longitude+1,a+longitude+2)])
    return points,faces


points,faces=[],[]
for py in [1.225,1.178,1.131,1.084]:
    for px in [-.055,.055]:
        p,f=ellipsoid([px,py,surface_z(px,py)+.008],[.011,.011,.005])
        faces.extend([[i+len(points) for i in tri] for tri in f]);points.extend(p)
mesh('Uniform eight silver buttons',points,faces,silver)
p,f=ellipsoid([0,1.437,surface_z(0,1.437)+.033],[.012,.020,.012])
mesh('Uniform ivory bow clasp',p,f,knot)

# A restrained red braid tie matches the uniform; it follows the head bone.
p,f=ellipsoid([0,1.51,-.169],[.029,.006,.019],20,8)
mesh('Hair neat red braid tie',p,f,red,
     joints=np.tile([joint_ids['Head'],joint_ids['Spine2'],0,0],(len(p),1)),
     weights=np.tile([.79,.21,0,0],(len(p),1)))

# Raised princess seams on the front and back follow the original jacket skin.
points,faces=[],[]
for front in [True,False]:
    for side in [-1,1]:
        start=len(points)
        for row in range(25):
            t=row/24;py=1.405-.365*t;px=side*(.095-.029*math.sin(t*math.pi*.65))
            pz=surface_z(px,py,front)+(1 if front else -1)*.002
            for col in range(7):
                angle=col/6*math.tau
                points.append([px+.0014*math.cos(angle),py,pz+.0014*math.sin(angle)])
                if row<24 and col<6:
                    a=start+row*7+col;faces.extend([(a,a+1,a+7),(a+1,a+8,a+7)])
mesh('Uniform tailored front and back seams',points,faces,seam)

# Small secondary cloth motion is baked into every existing action and blends
# with the same jump/slide/roll/gesture clips used by the runner controller.
for clip in g['animations']:
    duration=max(float(read(s['input'])[-1,0]) for s in clip['samplers'])
    times=np.linspace(0,duration,41)
    phase=times/max(duration,.001)
    if clip['name']=='Run':wave=np.sin(phase*math.tau*2)*.72
    elif clip['name'] in ['Jump','Slide','Roll']:wave=np.sin(phase*math.pi)*.42
    else:wave=np.sin(phase*math.tau)*.09
    values=np.stack([np.maximum(0,wave),np.maximum(0,-wave)],axis=-1).reshape(-1)
    sampler=len(clip['samplers'])
    clip['samplers'].append({'input':accessor(times),'output':accessor(values),'interpolation':'LINEAR'})
    clip['channels'].append({'sampler':sampler,'target':{'node':skirt_node,'path':'weights'}})

g['asset'].setdefault('extras',{}).update(uniformVersion=1,hairVersion=1,
    uniformDescription='Black tailored school jacket, folded crimson bow, eight silver buttons, pleated skirt, twin red hem bands and red cuffs.',
    uniformSourceDocument=base)
g['buffers'][0]['byteLength']=len(data)
metadata=json.dumps(g,separators=(',',':')).encode();metadata+=b' '*(-len(metadata)%4)
data.extend(b'\0'*(-len(data)%4))
length=28+len(metadata)+len(data)
target.write_bytes(struct.pack('<III',0x46546c67,2,length)+struct.pack('<II',len(metadata),0x4e4f534a)+metadata+struct.pack('<II',len(data),0x004e4942)+data)
print(f'Wrote {target}: {length:,} bytes; all {len(g["animations"])} animation clips preserved.')
