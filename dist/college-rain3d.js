import {BackSide, BufferAttribute, BufferGeometry, DynamicDrawUsage, Group,
  LineBasicMaterial, LineSegments, MeshBasicMaterial} from './vendor/three.module.js';
import {footSpray, rainSample} from './college-rain.js';

const noiseGLSL = `
  float rainHash(highp vec2 p) {
    highp vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float rainNoise(highp vec2 p) {
    highp vec2 i = floor(p), f = fract(p);
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
    shader.fragmentShader = 'varying vec3 domeDirection; uniform highp float stormTime;\n' + noiseGLSL +
      shader.fragmentShader.replace('#include <color_fragment>', `
        vec3 ray = normalize(domeDirection);
        highp float st = mod(stormTime, 600.0);
        vec2 p = ray.xz * 1.65 / max(.085, ray.y + .14) + vec2(st*.043,0.);
        float bank = .54*rainNoise(p) + .28*rainNoise(p*2.1) + .13*rainNoise(p*4.4) + .05*rainNoise(p*9.);
        vec3 clouds = mix(vec3(.038,.068,.135), vec3(.45,.55,.69), smoothstep(.21,.8,bank));
        diffuseColor.rgb = mix(vec3(.32,.45,.61), clouds, smoothstep(-.05,.23,ray.y));
      `);
  };
  return material;
}

// Use the ribbon UVs before texture repeats so water follows the road mesh on hills and bends.
export function wetCollegeAsphalt(material, distance, clock, strength, rainbowStrength = {value:0}, ultraStrength = {value:0}) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      roadDistance: distance,
      stormTime: clock,
      wetStrength: strength,
      rainbowStrength: rainbowStrength,
      ultraStrength: ultraStrength
    });
    shader.vertexShader = 'varying highp vec2 roadUv;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n roadUv = uv;');
    shader.fragmentShader = 'varying highp vec2 roadUv; uniform highp float roadDistance, stormTime; uniform float wetStrength, rainbowStrength, ultraStrength;\n' +
      noiseGLSL + shader.fragmentShader
        .replace('#include <color_fragment>', `
        #include <color_fragment>
        if (ultraStrength > 0.01) {
          highp float uDist = mod(roadDistance, 256.0);
          highp vec2 up = vec2((roadUv.x - 0.5) * 7.1, uDist - 35.0 + roadUv.y * 300.0);
          highp vec2 uNoise = vec2(up.x + 16.0, up.y + 64.0);
          float uPool = smoothstep(0.18, 0.72, rainNoise(uNoise * vec2(1.15, 0.625)) * 0.72 + rainNoise(uNoise * vec2(4.2, 2.5)) * 0.28);
          float uWet = clamp(wetStrength, 0.0, 1.0) * ultraStrength;
          // Subtle dry asphalt grain in sunshine; deepens into rich dark mirror-wet charcoal when rain rolls in (Panel 2 look)
          float dryGrain = rainNoise(uNoise * vec2(12.0, 12.0)) * 0.14;
          diffuseColor.rgb *= (0.92 + dryGrain) * mix(1.0, 0.44 - 0.14 * uPool, uWet);
          // Scattered wet golden-russet fallen leaves along both road curbs
          float curbBand = smoothstep(1.95, 3.30, abs(up.x));
          highp vec2 lCell = floor(uNoise * vec2(2.6, 2.0));
          float lRand = rainHash(lCell);
          vec2 lPos = fract(uNoise * vec2(2.6, 2.0)) - (0.28 + 0.44 * vec2(lRand, rainHash(lCell + 7.3)));
          float leafDot = (1.0 - smoothstep(0.06, 0.19, length(lPos * vec2(1.0, 1.45)))) * step(0.50, lRand) * curbBand;
          vec3 leafCol = mix(vec3(0.48, 0.28, 0.08), vec3(0.76, 0.50, 0.12), rainHash(lCell + 19.1));
          diffuseColor.rgb = mix(diffuseColor.rgb, leafCol, leafDot * 0.88 * ultraStrength);
        }
      `)
        .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float effWet = clamp(wetStrength, 0.0, 1.0);
        if (effWet > 0.005) {
          highp float distWrap = mod(roadDistance, 256.0);
          highp float timeWrap = mod(stormTime, 120.0);
          highp vec2 p = vec2((roadUv.x-.5)*7.1, distWrap-35.+roadUv.y*300.);
          // Keep noise coordinates strictly positive so mod/floor never creates a vertical seam at road center (p.x = 0).
          highp vec2 pNoise = vec2(p.x + 16.0, p.y + 64.0);
          float grain = rainNoise(pNoise*vec2(7.,18.) + vec2(0.,timeWrap*.65));
          float pool = smoothstep(.22,.68,rainNoise(pNoise*vec2(1.3,.78))*.73 + grain*.27);
          float lampX = abs(p.x) - (2.78 + .45*(grain-.5));
          float lampWave = clamp(.5+.5*cos(6.2831853*(p.y-64.)/32.*3.), 0.0, 1.0);
          float lamps = exp(-min(40.0, 6.*lampX*lampX)) * (lampWave*lampWave*lampWave);
          highp vec2 cells = pNoise*1.65;
          highp vec2 cell = floor(cells);
          float seed = rainHash(cell);
          float age = fract(timeWrap*(.64+.45*seed)+seed*17.) * 1.48;
          vec2 center = .32 + .36*vec2(seed,rainHash(cell+12.));
          float radius = length(fract(cells)-center);
          float width = clamp(fwidth(radius), .014, .45);
          float wave = 1.-smoothstep(0.,width,abs(radius-age*.31));
          float wake = 1.-smoothstep(0.,width,abs(radius-age*.31+.043));
          float ring = (wave + .36*wake) * max(0.,1.-age) * (.14+.86*pool);
          float detail = 1.-smoothstep(.025,.22,clamp(fwidth(p.y), 0.0, 2.0));
          
          vec3 rainbowRefl = vec3(0.);
          if (rainbowStrength > 0.01) {
            float rx = clamp((roadUv.x - 0.22) / 0.72, 0.0, 1.0);
            vec3 spectral = mix(
              mix(vec3(0.72, 0.15, 0.85), vec3(0.12, 0.35, 0.95), smoothstep(0.0, 0.22, rx)),
              mix(vec3(0.05, 0.82, 0.88), mix(vec3(0.15, 0.92, 0.30), mix(vec3(0.98, 0.86, 0.08), vec3(0.98, 0.20, 0.12), smoothstep(0.68, 1.0, rx)), smoothstep(0.40, 0.68, rx)), smoothstep(0.22, 0.40, rx)),
              smoothstep(0.18, 0.88, rx)
            );
            float sp = clamp(smoothstep(0.12, 0.75, pool), 0.0, 1.0);
            float reflGleam = sp * sqrt(max(sp, 1e-4)) * (0.35 + 0.65 * grain) * (0.8 + 0.3 * ring);
            rainbowRefl = spectral * reflGleam * rainbowStrength * 1.5;
          }

          vec3 wetGlow = vec3(.06,.12,.22)*pool + vec3(1.37,.53,.09)*lamps*pool*(.09+grain)
            + vec3(.24,.36,.52)*ring*detail + rainbowRefl;

          if (ultraStrength > 0.01) {
            // ULTRA-only mirror-wet puddle reflections: shimmering amber streetlamp columns, warm window smears, and overcast sky sheen
            float shimmer = 0.68 + 0.32 * rainNoise(pNoise * vec2(3.8, 1.2) + vec2(0.0, -timeWrap * 1.35));
            float curbDist = abs(p.x);
            // Elongated warm golden streetlamp columns reflecting down both sides of the wet asphalt
            float lampColBand = exp(-min(30.0, 1.55 * pow(curbDist - 2.35, 2.0)));
            float lampStreak = (0.35 + 0.65 * pow(lampWave, 1.6)) * lampColBand * (0.35 + 0.65 * pool) * shimmer;
            // Warm glowing heritage window reflections spilling into outer puddles
            float winBand = smoothstep(1.35, 3.35, curbDist);
            float winWave = 0.5 + 0.5 * sin(p.y * 0.55 + (p.x > 0.0 ? 1.4 : 0.0));
            float winRefl = winBand * (0.45 + 0.55 * winWave) * pool * (0.55 + 0.45 * grain);
            // Center road cool overcast sky puddle reflection (clamped safely — zero white blowout!)
            float centerBand = 1.0 - smoothstep(0.5, 2.8, curbDist);
            float skyMirror = centerBand * smoothstep(0.32, 0.82, pool) * (0.72 + 0.28 * grain);
            // Extra crisp secondary raindrop rings in ULTRA puddles
            highp vec2 cells2 = pNoise * 2.45 + vec2(5.3, 9.1);
            highp vec2 cell2 = floor(cells2);
            float seed2 = rainHash(cell2);
            float age2 = fract(timeWrap * (0.82 + 0.4 * seed2) + seed2 * 13.0) * 1.35;
            float rad2 = length(fract(cells2) - (0.3 + 0.4 * vec2(seed2, rainHash(cell2 + 4.7))));
            float ring2 = (1.0 - smoothstep(0.0, 0.055, abs(rad2 - age2 * 0.28))) * max(0.0, 1.0 - age2) * pool * detail;

            vec3 ultraRefl =
              vec3(1.18, 0.68, 0.22) * lampStreak * 0.62 +
              vec3(0.95, 0.52, 0.16) * winRefl * 0.28 +
              vec3(0.24, 0.34, 0.48) * skyMirror * 0.42 +
              vec3(0.52, 0.68, 0.86) * ring2 * 0.48;
            wetGlow += ultraRefl * ultraStrength;
          }

          totalEmissiveRadiance += effWet * max(vec3(0.0), wetGlow);
        }
      `)
        .replace('#include <lights_fragment_end>', `
        #include <lights_fragment_end>
        // Prevent harsh white sun/sky specular blowout patches on the foreground wet College road across all GPU tiers.
        reflectedLight.directSpecular = min(reflectedLight.directSpecular * 0.08, vec3(0.02));
        reflectedLight.indirectSpecular = min(reflectedLight.indirectSpecular * 0.25, vec3(0.03));
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
  const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const layers = [0,1].map(layer => {
    const count = layer ? (isTouch ? 130 : 265) : (isTouch ? 300 : 650), depth = layer ? 13 : 54;
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
