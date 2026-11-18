import {
  Color, TextureLoader, RepeatWrapping, SRGBColorSpace, EquirectangularReflectionMapping,
  Mesh, MeshStandardMaterial, PlaneGeometry, DoubleSide
} from './vendor/three.module.js';

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
  function strip(name, x, y, width, height, span, across, tint) {
    const surface = box(scene, tint, x, y, -65, width, height, 200);
    const map = texture(name);
    if (map && !scrolling.some(entry => entry.map === map)) {
      map.repeat.set(across, 200 / span);
      scrolling.push({map, span});
    }
    surface.material = new MeshStandardMaterial({color:tint, map, roughness:.96});
    return surface.material;
  }
  strip('turf', 0, -.34, 240, .3, 5, 48, 0xd7cfac);
  box(scene, 0x9b8e75, 0, -.12, -65, 14, .3, 200);
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
  const dry = new Color(0xffffff), wet = new Color(0x9099a1);
  return (distance, weather) => {
    for (const {map, span} of scrolling) map.offset.y = (distance / span) % 1;
    road.color.copy(dry).lerp(wet, weather.rain);
    road.roughness = 1 - .69 * weather.rain;
    road.envMapIntensity = .35 + weather.rain * 1.95;
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
