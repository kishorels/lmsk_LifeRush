import {BackSide, BufferAttribute, BufferGeometry, DynamicDrawUsage, Group,
  LineBasicMaterial, LineSegments, MeshBasicMaterial} from './vendor/three.module.js';
import {footSpray, rainSample} from './college-rain.js';

const noiseGLSL = `
  float rainHash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float rainNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.-2.*f);
    return mix(mix(rainHash(i),rainHash(i+vec2(1,0)),f.x),
               mix(rainHash(i+vec2(0,1)),rainHash(i+1.),f.x),f.y);
  }
`;

export function stormSkyMaterial(clock) {
  const material = new MeshBasicMaterial({side:BackSide, depthWrite:false, fog:false});
  material.onBeforeCompile = shader => {
    shader.uniforms.stormTime = clock;
    shader.vertexShader = 'varying vec3 domeDirection;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n domeDirection = position;');
    shader.fragmentShader = 'varying vec3 domeDirection; uniform float stormTime;\n' + noiseGLSL +
      shader.fragmentShader.replace('#include <color_fragment>', `
        vec3 ray = normalize(domeDirection);
        vec2 p = ray.xz * 1.65 / max(.085, ray.y + .14) + vec2(stormTime*.043,0.);
        float bank = .54*rainNoise(p) + .28*rainNoise(p*2.1) + .13*rainNoise(p*4.4) + .05*rainNoise(p*9.);
        vec3 clouds = mix(vec3(.038,.068,.135), vec3(.45,.55,.69), smoothstep(.21,.8,bank));
        diffuseColor.rgb = mix(vec3(.32,.45,.61), clouds, smoothstep(-.05,.23,ray.y));
      `);
  };
  return material;
}

// Use the ribbon UVs before texture repeats so water follows the road mesh on hills and bends.
export function wetCollegeAsphalt(material, distance, clock, strength, rainbowStrength = {value:0}) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      roadDistance: distance,
      stormTime: clock,
      wetStrength: strength,
      rainbowStrength: rainbowStrength
    });
    shader.vertexShader = 'varying vec2 roadUv;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n roadUv = uv;');
    shader.fragmentShader = 'varying vec2 roadUv; uniform float roadDistance, stormTime, wetStrength, rainbowStrength;\n' +
      noiseGLSL + shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        if (wetStrength > 0.) {
          vec2 p = vec2((roadUv.x-.5)*7.1, roadDistance-35.+roadUv.y*300.);
          float grain = rainNoise(p*vec2(7.,18.) + vec2(0.,stormTime*.65));
          float pool = smoothstep(.22,.68,rainNoise(p*vec2(1.3,.78))*.73 + grain*.27);
          float lampX = abs(p.x) - (2.78 + .45*(grain-.5));
          float lamps = exp(-6.*lampX*lampX) * pow(.5+.5*cos(6.283*(p.y-64.)/32.*3.),3.);
          vec2 cells = p*1.65, cell = floor(cells);
          float seed = rainHash(cell);
          float age = fract(stormTime*(.64+.45*seed)+seed*17.) * 1.48;
          vec2 center = .32 + .36*vec2(seed,rainHash(cell+12.));
          float radius = length(fract(cells)-center);
          float width = max(.014, fwidth(radius));
          float wave = 1.-smoothstep(0.,width,abs(radius-age*.31));
          float wake = 1.-smoothstep(0.,width,abs(radius-age*.31+.043));
          float ring = (wave + .36*wake) * max(0.,1.-age) * (.14+.86*pool);
          float detail = 1.-smoothstep(.025,.22,fwidth(p.y));
          
          vec3 rainbowRefl = vec3(0.);
          if (rainbowStrength > 0.01) {
            float rx = clamp((roadUv.x - 0.22) / 0.72, 0.0, 1.0);
            vec3 spectral = mix(
              mix(vec3(0.72, 0.15, 0.85), vec3(0.12, 0.35, 0.95), smoothstep(0.0, 0.22, rx)),
              mix(vec3(0.05, 0.82, 0.88), mix(vec3(0.15, 0.92, 0.30), mix(vec3(0.98, 0.86, 0.08), vec3(0.98, 0.20, 0.12), smoothstep(0.68, 1.0, rx)), smoothstep(0.40, 0.68, rx)), smoothstep(0.22, 0.40, rx)),
              smoothstep(0.18, 0.88, rx)
            );
            float reflGleam = pow(smoothstep(0.12, 0.75, pool), 1.2) * (0.35 + 0.65 * grain) * (0.8 + 0.3 * ring);
            rainbowRefl = spectral * reflGleam * rainbowStrength * 1.5;
          }

          totalEmissiveRadiance += wetStrength * (
            vec3(.06,.12,.22)*pool + vec3(1.37,.53,.09)*lamps*pool*(.09+grain)
            + vec3(.24,.36,.52)*ring*detail + rainbowRefl);
        }
      `);
  };
}

function segments(parent, count, color, opacity) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count*6),3).setUsage(DynamicDrawUsage));
  const lines = new LineSegments(geometry, new LineBasicMaterial({color,opacity,transparent:true,depthWrite:false}));
  lines.frustumCulled = false;
  parent.add(lines);
  return lines;
}

export function createCollegeShower(scene) {
  const group = new Group();
  group.name = 'college-shower';
  scene.add(group);
  const layers = [0,1].map(layer => {
    const count = layer ? 265 : 650, depth = layer ? 13 : 54;
    const lines = segments(group,count,layer ? 0xdaeaff : 0xc3d5ec,layer ? .53 : .36);
    const samples = Array.from({length:count}, (_,i) => ({
      x:(rainSample(i,layer*5)-.5)*(layer ? 23 : 54),
      y:rainSample(i,1+layer*5)*18, z:rainSample(i,2+layer*5)*depth,
      speed:14+rainSample(i,3+layer*5)*8, length:.26+rainSample(i,4+layer*5)*.46
    }));
    return {lines,samples,depth};
  });
  const spray = segments(group,18,0xd7edff,.83);
  return (state, visible) => {
    group.visible = visible;
    if (!visible) return;
    for (const {lines,samples,depth} of layers) {
      const pos = lines.geometry.attributes.position;
      const arr = pos.array;
      let ptr = 0;
      for (let i=0;i<samples.length;i++) {
        const drop=samples[i], fall=(drop.y+state.time*drop.speed)%18;
        const x=drop.x+fall*.23, y=17-fall, z=7-(drop.z+depth-(state.distance%depth))%depth;
        arr[ptr++] = x;
        arr[ptr++] = y;
        arr[ptr++] = z;
        arr[ptr++] = x + drop.length * .23;
        arr[ptr++] = y - drop.length;
        arr[ptr++] = z;
      }
      pos.needsUpdate=true;
    }
    const pos = spray.geometry.attributes.position;
    const sArr = pos.array;
    let sPtr = 0, count = 0;
    footSpray(state,(x,y,z,dx,dy) => {
      sArr[sPtr++] = x;
      sArr[sPtr++] = y;
      sArr[sPtr++] = z;
      sArr[sPtr++] = x + dx;
      sArr[sPtr++] = y + dy;
      sArr[sPtr++] = z + .025;
      count += 2;
    });
    spray.geometry.setDrawRange(0,count);
    pos.needsUpdate=true;
  };
}
