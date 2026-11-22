import { Group, Mesh } from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Bake in world space, retaining vertex indices so adjoining triangles can
// reuse transformed vertices. A single material only needs one draw.
export function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(part => {
    if (!part.isMesh) return;
    const geo = part.geometry.clone().applyMatrix4(part.matrixWorld);
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!batches.has(part.material)) batches.set(part.material, []);
    batches.get(part.material).push(geo);
  });

  const result = new Group();
  for (const [material, geometries] of batches) {
    if (geometries.length > 1 && geometries.some(geo => geo.index)) {
      // Extrusions can share a material with indexed boxes and cylinders.
      for (const geo of geometries) {
        if (!geo.index) geo.setIndex(Array.from({ length: geo.attributes.position.count }, (_, i) => i));
      }
    }
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new Mesh(merged, material);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; // The baked vertices already include each part's transform.
      result.add(mesh);
    }
    if (geometries.length > 1) for (const geo of geometries) geo.dispose();
  }
  return result;
}
