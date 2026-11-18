"""Shrink a runner GLB in place, retaining alpha cutouts and all mesh data."""
from pathlib import Path
from io import BytesIO
import json,struct,sys
from PIL import Image

path=Path(sys.argv[1])
raw=path.read_bytes()
size=struct.unpack_from('<I',raw,12)[0]
model=json.loads(raw[20:20+size])
source=raw[28+size:]
images={im['bufferView']:im for im in model['images']}
data=bytearray()
for i,view in enumerate(model['bufferViews']):
    start=view.get('byteOffset',0)
    chunk=source[start:start+view['byteLength']]
    if i in images:
        im=Image.open(BytesIO(chunk)).convert('RGBA')
        if im.getchannel('A').getextrema()==(255,255):
            out=BytesIO()
            im.convert('RGB').save(out,format='JPEG',quality=90,subsampling=0)
            if len(out.getvalue())<len(chunk):
                chunk=out.getvalue()
                images[i]['mimeType']='image/jpeg'
    view.update(byteOffset=len(data),byteLength=len(chunk))
    data.extend(chunk)
    data.extend(b'\0'*(-len(data)%4))
model['buffers'][0]['byteLength']=len(data)
header=json.dumps(model,separators=(',',':')).encode()
header+=b' '*(-len(header)%4)
path.write_bytes(struct.pack('<4sIIII',b'glTF',2,28+len(header)+len(data),len(header),0x4e4f534a)+header+struct.pack('<II',len(data),0x004e4942)+data)
