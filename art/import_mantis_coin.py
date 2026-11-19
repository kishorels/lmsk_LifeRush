"""Bundle the supplied Sketchfab coin ZIP as an upright, mobile-sized GLB.

Usage: python art/import_mantis_coin.py path/to/mantis_flip_coin.zip
Requires Pillow. Keeps the original mesh, UVs, PBR maps and licence metadata.
"""
import io
import json
import math
from pathlib import Path
import struct
import sys
import zipfile

from PIL import Image


def import_coin(archive, target):
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as source:
        model = json.loads(source.read('scene.gltf'))
        binary = bytearray(source.read(model['buffers'][0]['uri']))
        for image in model['images']:
            uri = image.pop('uri')
            texture = Image.open(io.BytesIO(source.read(uri)))
            limit = 1024 if 'baseColor' in uri or 'normal' in uri else 512
            texture.thumbnail((limit, limit), Image.Resampling.LANCZOS)
            encoded = io.BytesIO()
            texture.save(encoded, format='PNG', optimize=True)
            binary.extend(b'\0' * (-len(binary) % 4))
            image['bufferView'] = len(model['bufferViews'])
            image['mimeType'] = 'image/png'
            model['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(encoded.getvalue())})
            binary.extend(encoded.getvalue())

        # Remove the viewer's tilted display pose. Meshes share a centred Y-axis.
        bounds = [model['accessors'][p['attributes']['POSITION']] for m in model['meshes'] for p in m['primitives']]
        low = [min(a['min'][i] for a in bounds) for i in range(3)]
        high = [max(a['max'][i] for a in bounds) for i in range(3)]
        scale = .54 / max(high[i] - low[i] for i in range(3))
        centre = [(low[i] + high[i]) / 2 for i in range(3)]
        model['nodes'] = [
            {'name': 'MantisFlipCoin', 'children': [1], 'scale': [scale] * 3,
             'rotation': [math.sin(math.pi / 4), 0, 0, math.cos(math.pi / 4)]},
            {'name': 'CentredCoin', 'translation': [-v for v in centre],
             'children': list(range(2, 2 + len(model['meshes'])))},
            *[{'name': m['name'], 'mesh': i} for i, m in enumerate(model['meshes'])]
        ]
        model['scenes'] = [{'name': 'Mantis Flip Coin', 'nodes': [0]}]
        model['scene'] = 0
        for mesh in model['meshes']:
            for primitive in mesh['primitives']:
                # The source duplicates its UV channel four times; all maps use UV0.
                for key in list(primitive['attributes']):
                    if key.startswith('TEXCOORD_') and key != 'TEXCOORD_0':
                        del primitive['attributes'][key]
        model['buffers'] = [{'byteLength': len(binary)}]
        model['asset']['extras']['modifications'] = 'Repacked as GLB; textures resized; display pose removed; centred and scaled to 0.54 game units.'
        metadata = json.dumps(model, separators=(',', ':')).encode()
        metadata += b' ' * (-len(metadata) % 4)
        binary.extend(b'\0' * (-len(binary) % 4))
        length = 12 + 8 + len(metadata) + 8 + len(binary)
        glb = struct.pack('<III', 0x46546C67, 2, length)
        glb += struct.pack('<II', len(metadata), 0x4E4F534A) + metadata
        glb += struct.pack('<II', len(binary), 0x004E4942) + binary
        (target / 'mantis-flip-coin.glb').write_bytes(glb)
        (target / 'mantis-flip-coin.LICENSE.txt').write_bytes(source.read('license.txt'))
        print(f'Imported Mantis Flip Coin: {len(glb):,} bytes')


if __name__ == '__main__':
    import_coin(Path(sys.argv[1]), Path(__file__).resolve().parents[1] / 'dist' / 'assets')
