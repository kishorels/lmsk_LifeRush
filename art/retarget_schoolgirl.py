"""Copy the schoolboy's GLB motion into the schoolgirl's joint rest frames."""
import json
import struct
import sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R

def read(path):
    raw=path.read_bytes()
    size=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+size]),bytearray(raw[28+size:])

def frames(g):
    world={}
    parents={child:i for i,n in enumerate(g['nodes']) for child in n.get('children',[])}
    def rotation(i):
        if i not in world:
            parent=rotation(parents[i]) if i in parents else R.identity()
            world[i]=parent*R.from_quat(g['nodes'][i].get('rotation',[0,0,0,1]))
        return world[i]
    return [(rotation(parents[i]) if i in parents else R.identity(),rotation(i)) for i in range(len(g['nodes']))]

src,dst=map(Path,sys.argv[1:])
boy,source=read(src)
girl,data=read(dst)
bf,gf=frames(boy),frames(girl)
ids={n['name']:i for i,n in enumerate(girl['nodes'])}
girl['animations']=[]
def values(i):
    a=boy['accessors'][i];v=boy['bufferViews'][a['bufferView']]
    return np.frombuffer(source,dtype='<f4',offset=v.get('byteOffset',0)+a.get('byteOffset',0),
        count=a['count']*{'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]).reshape(a['count'],-1)
def append(v):
    v=np.asarray(v,dtype='<f4');raw=v.tobytes()
    view=len(girl['bufferViews'])
    girl['bufferViews'].append(dict(buffer=0,byteOffset=len(data),byteLength=len(raw)))
    data.extend(raw)
    girl['accessors'].append(dict(bufferView=view,componentType=5126,count=len(v),
        type={1:'SCALAR',3:'VEC3',4:'VEC4'}[v.shape[1]],min=v.min(0).tolist(),max=v.max(0).tolist()))
    return len(girl['accessors'])-1
times={}
for clip in boy['animations']:
    out=dict(name=clip['name'],channels=[],samplers=[])
    for ch in clip['channels']:
        i=ch['target']['node'];node=boy['nodes'][i];name=node['name'];path=ch['target']['path']
        if name not in ids or not name.startswith('mixamorig:'):continue
        if path!='rotation' and not (path=='translation' and name=='mixamorig:Hips'):continue
        j=ids[name];sam=clip['samplers'][ch['sampler']];v=values(sam['output'])
        if path=='rotation':
            v=(gf[j][0].inv()*bf[i][0]*R.from_quat(v)*bf[i][1].inv()*gf[j][1]).as_quat()
        else:
            v=(gf[j][0].inv()*bf[i][0]).apply(v-node['translation'])*1.18+girl['nodes'][j]['translation']
        t=sam['input']
        if t not in times:times[t]=append(values(t))
        out['channels'].append(dict(target=dict(node=j,path=path),sampler=len(out['samplers'])))
        out['samplers'].append(dict(input=times[t],output=append(v),interpolation=sam.get('interpolation','LINEAR')))
    girl['animations'].append(out)
girl['buffers'][0]['byteLength']=len(data)
header=json.dumps(girl,separators=(',',':')).encode()
header+=b' '*(-len(header)%4)
dst.write_bytes(struct.pack('<4sIIII',b'glTF',2,28+len(header)+len(data),len(header),0x4e4f534a)+header+struct.pack('<II',len(data),0x004e4942)+data)
