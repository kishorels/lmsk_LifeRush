"""Restore the girl's original casual outfit while keeping her repaired hair."""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'dist/assets/schoolgirl.glb'
target = ROOT / 'dist/assets/casual-schoolgirl.glb'
data = source.read_bytes()
assert data[:4] == b'glTF'
json_size, json_type = struct.unpack_from('<I4s', data, 12)
assert json_type == b'JSON'
document = json.loads(data[20:20 + json_size])
original = document['asset']['extras']['uniformSourceDocument']
document['nodes'] = document['nodes'][:len(original['nodes'])]
document['nodes'][139]['children'] = original['nodes'][139]['children']
document['nodes'][67]['name'] = original['nodes'][67]['name']
document['meshes'][2] = original['meshes'][2]
for index in (5, 6):
    document['meshes'][index] = original['meshes'][index]
document['animations'] = original['animations']
document['asset']['extras'].pop('uniformVersion', None)
document['asset']['extras']['casualOutfit'] = True
bin_offset = 20 + json_size
bin_size, bin_type = struct.unpack_from('<I4s', data, bin_offset)
assert bin_type == b'BIN\0'
binary = data[bin_offset + 8:bin_offset + 8 + bin_size]
encoded = json.dumps(document, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
binary += b'\0' * (-len(binary) % 4)
target.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(encoded) + 8 + len(binary))
                   + struct.pack('<I4s', len(encoded), b'JSON') + encoded
                   + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
print(f'{target.name}: {target.stat().st_size} bytes')
