import { Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const vertexColorMats = new Map();

function canVertexColorMerge(mat) {
  if (!mat || !mat.isMeshStandardMaterial) return false;
  if (mat.map || mat.emissiveMap || mat.bumpMap || mat.normalMap || mat.roughnessMap || mat.metalnessMap || mat.alphaMap) return false;
  if (mat.transparent || mat.opacity < 1 || mat.alphaTest > 0 || mat.side !== 0) return false;
  if (Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile')) return false;
  if (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) return false;
  return true;
}

function getVertexColorMat(mat) {
  const isMetal = (mat.metalness ?? 0) >= 0.35;
  const isGloss = (mat.roughness ?? 0.7) < 0.38;
  const key = isMetal ? (isGloss ? 'm-g' : 'm-s') : (isGloss ? 'd-g' : 'd-m');
  if (!vertexColorMats.has(key)) {
    vertexColorMats.set(key, new MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: isMetal ? (isGloss ? 0.24 : 0.42) : (isGloss ? 0.28 : 0.78),
      metalness: isMetal ? 0.62 : 0.06
    }));
  }
  return vertexColorMats.get(key);
}

// Bake in world space, retaining vertex indices and merging compatible solid-color
// opaque MeshStandardMaterials via vertex colors so entire buildings draw in ~2-5 calls.
export function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  const vcBatches = new Map();

  group.traverse(part => {
    if (!part.isMesh) return;
    const mat = part.material;
    const geo = part.geometry.clone().applyMatrix4(part.matrixWorld);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    if (canVertexColorMerge(mat)) {
      for (const name of Object.keys(geo.attributes)) {
        if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
      }
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const r = mat.color?.r ?? 1, g = mat.color?.g ?? 1, b = mat.color?.b ?? 1;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        colors[idx] = r;
        colors[idx + 1] = g;
        colors[idx + 2] = b;
      }
      geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
      const sharedMat = getVertexColorMat(mat);
      if (!vcBatches.has(sharedMat)) vcBatches.set(sharedMat, []);
      vcBatches.get(sharedMat).push(geo);
    } else {
      for (const name of Object.keys(geo.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
      }
      if (!batches.has(mat)) batches.set(mat, []);
      batches.get(mat).push(geo);
    }
  });

  const result = new Group();
  const emitBatches = map => {
    for (const [material, geometries] of map) {
      if (geometries.length > 1 && geometries.some(geo => geo.index)) {
        for (const geo of geometries) {
          if (!geo.index) geo.setIndex(Array.from({ length: geo.attributes.position.count }, (_, i) => i));
        }
      }
      const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
      if (merged) {
        const mesh = new Mesh(merged, material);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        result.add(mesh);
      }
      if (geometries.length > 1) for (const geo of geometries) geo.dispose();
    }
  };
  emitBatches(vcBatches);
  emitBatches(batches);
  return result;
}
