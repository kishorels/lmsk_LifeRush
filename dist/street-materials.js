import {
  Color, TextureLoader, RepeatWrapping, SRGBColorSpace, EquirectangularReflectionMapping,
  Mesh, MeshStandardMaterial, PlaneGeometry, DoubleSide, Group, InstancedMesh, Object3D, DynamicDrawUsage
} from './vendor/three.module.js';
import { roadCurveX, roadCurveY, roadCurveSlope, curveRelX, curveRelY } from './campus-layout.js';
export { roadCurveX, roadCurveY, roadCurveSlope, curveRelX, curveRelY };

const textures = new Map();
function texture(name, color = true) {
  if (typeof document === 'undefined') return null;
  if (!textures.has(name)) {
    const map = new TextureLoader().load(new URL('./assets/street/' + name + '.webp', import.meta.url).href);
    if (color) map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.anisotropy = 4;
    textures.set(name, map);
  }
  return textures.get(name);
}

export function streetSurfaces(scene, box) {
  const environment = texture('campus-light');
  if (environment) {
    environment.mapping = EquirectangularReflectionMapping;
    scene.environment = environment;
  }
  const scrolling = [];
  const schoolGroup = new Group();
  const collegeGroup = new Group();
  collegeGroup.visible = false;
  scene.add(schoolGroup, collegeGroup);

  function strip(name, x, y, width, height, span, across, tint) {
    const surface = box(schoolGroup, tint, x, y, -65, width, height, 200);
    const map = texture(name);
    if (map && !scrolling.some(entry => entry.map === map)) {
      map.repeat.set(across, 200 / span);
      scrolling.push({map, span});
    }
    surface.material = new MeshStandardMaterial({color:tint, map, roughness:.96});
    return surface.material;
  }
  strip('turf', 0, -.34, 240, .3, 5, 48, 0xd7cfac);
  box(schoolGroup, 0x9b8e75, 0, -.12, -65, 14, .3, 200);
  const road = strip('asphalt', 0, .02, 7.1, .14, 16, 1, 0xffffff);
  strip('pavers', -4.4, .06, 1.65, .22, 3.3, 1, 0xffffff);
  strip('pavers', 4.4, .06, 1.65, .22, 3.3, 1, 0xffffff);
  const patches = texture('road-roughness', false);
  if (patches) {
    patches.repeat.set(1, 200 / 16);
    scrolling.push({map:patches, span:16});
    road.roughnessMap = patches;
    road.bumpMap = road.map;
    road.bumpScale = .018;
  }

  // Subdivided Kodaikanal-style curving road ribbons for College mode
  const collegeRibbons = [];
  function curvedStrip(mat, xOffset, yOffset, width, segsZ = 54, segsX = 1) {
    const geom = new PlaneGeometry(width, 200, segsX, segsZ);
    geom.rotateX(-Math.PI / 2);
    geom.translate(xOffset, yOffset, -65);
    const pos = geom.attributes.position;
    const base = new Float32Array(pos.array);
    const mesh = new Mesh(geom, mat);
    mesh.receiveShadow = true;
    collegeGroup.add(mesh);
    collegeRibbons.push({ geom, pos, base });
    return mesh;
  }
  const turfMat = new MeshStandardMaterial({ color: 0x77966c, map: texture('turf'), roughness: .98 });
  const gravelMat = new MeshStandardMaterial({ color: 0x5c635f, roughness: .95 });
  const railMat = new MeshStandardMaterial({ color: 0x627578, roughness: .48, metalness: .38 });
  const curbMat = new MeshStandardMaterial({ color: 0xc1c7c2, roughness: .75 });
  const paversMat = new MeshStandardMaterial({ color: 0xd0cfc5, map: texture('pavers'), roughness: .9 });
  const collegeRoadMat = new MeshStandardMaterial({color:0x969b9c,map:road.map,roughness:.95,roughnessMap:patches,bumpMap:road.map,bumpScale:.018});
  const paintMat = new MeshStandardMaterial({color:0xe8e7d8,roughness:.89,emissive:0x11120e,emissiveIntensity:.08});
  curvedStrip(turfMat, 0, -.20, 240, 36, 4);
  curvedStrip(gravelMat, 0, -.04, 13.6, 54, 1);
  curvedStrip(collegeRoadMat, 0, .09, 7.1, 54, 1);
  curvedStrip(paintMat, -3.36, .104, .075, 54, 1);
  curvedStrip(paintMat, 3.36, .104, .075, 54, 1);
  curvedStrip(paversMat, -4.4, .14, 1.65, 54, 1);
  curvedStrip(paversMat, 4.4, .14, 1.65, 54, 1);
  // Mountain ghat guardrails & concrete curbs along both edges of the College road
  curvedStrip(curbMat, -5.28, .22, .28, 54, 1);
  curvedStrip(curbMat, 5.28, .22, .28, 54, 1);
  curvedStrip(railMat, -5.32, .48, .18, 54, 1);
  curvedStrip(railMat, 5.32, .48, .18, 54, 1);

  // Two staggered lane dividers follow the same curve as the road.
  const dashGeometry = new PlaneGeometry(.075, 2.45);
  dashGeometry.rotateX(-Math.PI / 2);
  const dashes = new InstancedMesh(dashGeometry, paintMat, 56);
  dashes.instanceMatrix.setUsage(DynamicDrawUsage);
  dashes.frustumCulled = false;
  collegeGroup.add(dashes);
  const dashTransform = new Object3D();

  const dry = new Color(0xffffff), wet = new Color(0x9099a1);
  return (distance, weather, map = 'school') => {
    const isCollege = map === 'college';
    schoolGroup.visible = !isCollege;
    collegeGroup.visible = isCollege;
    for (const {map: m, span} of scrolling) m.offset.y = (distance / span) % 1;
    if (isCollege) {
      const originX = roadCurveX(distance, 'college');
      const originY = roadCurveY(distance, 'college');
      const first = Math.floor((distance - 32) / 7) * 7;
      for(let n=0;n<28;n++){
        const worldDist=first+n*7,curveX=roadCurveX(worldDist,'college')-originX;
        const curveY=roadCurveY(worldDist,'college')-originY;
        dashTransform.rotation.y=-Math.atan(roadCurveSlope(worldDist,'college'));
        for(let lane=0;lane<2;lane++){
          dashTransform.position.set(curveX+(lane?1.1:-1.1),curveY+.116,distance-worldDist);
          dashTransform.updateMatrix();dashes.setMatrixAt(n*2+lane,dashTransform.matrix);
        }
      }
      dashes.instanceMatrix.needsUpdate=true;
      for (const { geom, pos, base } of collegeRibbons) {
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const zScene = base[i + 2];
          const worldDist = distance - zScene;
          arr[i] = base[i] + (roadCurveX(worldDist, 'college') - originX);
          arr[i + 1] = base[i + 1] + (roadCurveY(worldDist, 'college') - originY);
        }
        pos.needsUpdate = true;
        geom.computeBoundingSphere();
      }
    }
    road.color.copy(dry).lerp(wet, weather.rain);
    road.roughness = 1 - .69 * weather.rain;
    road.envMapIntensity = .35 + weather.rain * 1.95;
    collegeRoadMat.color.set(0x969b9c).lerp(wet,weather.rain);
    collegeRoadMat.roughness = 1 - .69 * weather.rain;
    scene.environmentIntensity = .52 - weather.night * .39;
  };
}

const masonry = new Map([
  [0xffd888,0xc0a17d], [0xf3ead2,0xd6ceba], [0xe8794e,0xb47559],
  [0x208d9e,0x53716e], [0xf3bc88,0xc7ad91], [0x216c6c,0x4c6763],
  [0xffedc7,0xdad1bd], [0x44897e,0x607771]
]);
export function campusMaterial(color) {
  if (masonry.has(color)) return new MeshStandardMaterial({
    color:masonry.get(color), map:texture('plaster'), roughness:.93
  });
  if ([0x276fa0,0x537f91,0x55788d].includes(color)) return new MeshStandardMaterial({
    color:0x384f59, roughness:.17, metalness:.46, envMapIntensity:1.3,
    emissive:0xdfaa71, emissiveIntensity:0
  });
  if (color === 0x3da85a) return new MeshStandardMaterial({
    color:0xc7cc9c, map:texture('turf'), roughness:1
  });
  return new MeshStandardMaterial({color, roughness:.82});
}

const foliage = new Map();
export function roadsideTree(parent, x, z, height, palm = false, angle = 0) {
  const species = palm ? 'palm' : 'neem';
  if (!foliage.has(species)) {
    const material = new MeshStandardMaterial({
      map:texture(species), alphaTest:.45, side:DoubleSide, roughness:1,
      color:0xf0edda
    });
    foliage.set(species, material);
  }
  const width = height * (palm ? .77 : 1.05);
  const tree = new Mesh(treePlane, foliage.get(species));
  tree.scale.set(width, height, 1);
  tree.position.set(x, height/2 + .12, z);
  tree.rotation.y = angle;
  tree.castShadow = tree.receiveShadow = true;
  parent.add(tree);
}
const treePlane = new PlaneGeometry();
