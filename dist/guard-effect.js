import * as T from './vendor/three.module.js';
import {coinReflections,makePickupGlint} from './coin.js';

// Three open curved panels and orbit trails, matching the amber protection reference.
export function createGuardEffect(runner) {
  const root = new T.Group();
  root.name = 'guard-protection';
  root.scale.setScalar(0.66);
  root.visible = false;
  runner.add(root);
  const radius = 1.03, span = 1.28, tall = .56;
  const surface = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: {flash: {value: 0}, fade: {value: 1}},
    vertexShader: `varying vec2 panelUv;varying vec3 panelNormal;varying vec3 panelView;
      void main(){panelUv=uv;vec4 p=modelViewMatrix*vec4(position,1.0);
        panelNormal=normalize(normalMatrix*normal);panelView=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `
      varying vec2 panelUv;
      varying vec3 panelNormal;
      varying vec3 panelView;
      uniform float flash;
      uniform float fade;
      void main(){
        vec2 p=vec2(panelUv.x*1.3184,panelUv.y*0.56)*8.5;
        vec2 cell=vec2(1.0,1.7320508);
        vec2 a=mod(p,cell)-cell*0.5;
        vec2 b=mod(p-cell*0.5,cell)-cell*0.5;
        vec2 h=abs(dot(a,a)<dot(b,b)?a:b);
        float d=max(h.x,dot(h,vec2(0.5,0.8660254)));
        float aa=max(fwidth(d),0.008);
        float hex=smoothstep(0.465-aa,0.495,d);
        float edge=min(min(panelUv.x,1.0-panelUv.x),min(panelUv.y,1.0-panelUv.y));
        float rim=1.0-smoothstep(0.02,0.14,edge);
        float frBase=clamp(1.0-abs(dot(normalize(panelNormal),normalize(panelView))),0.0,1.0);
        float fresnel=frBase*frBase;
        float rBase=clamp(1.0-abs(panelUv.x-.3)*3.0,0.0,1.0);
        float r2=rBase*rBase, r4=r2*r2, reflection=r4*r4*r2;
        vec3 amber=mix(vec3(0.42,0.12,0.006),vec3(1.6,0.56,0.015),rim*.65+fresnel*.35);
        amber+=hex*vec3(.65,0.20,0.005)+reflection*vec3(.45,.24,.05)+flash;
        gl_FragColor=vec4(amber,(.34+hex*.18+rim*.24+flash*.2)*fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const edgeMaterial = new T.MeshStandardMaterial({color:0xffb22a,metalness:.55,roughness:.25,
    emissive:0xff7b05,emissiveIntensity:.8,transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide});
  const coreMaterial = new T.MeshBasicMaterial({color:0xffefd1,transparent:true,opacity:1,depthWrite:false,toneMapped:false});
  const haloMaterial = new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    uniforms:{fade:{value:1},flash:{value:0}},
    vertexShader:`varying vec2 panelUv;void main(){panelUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 panelUv;uniform float fade;uniform float flash;
      void main(){
        vec2 q=abs((panelUv-.5)*vec2(1.3184,.56))-vec2(.6592,.28);
        float distanceToEdge=abs(length(max(q,0.0))+min(max(q.x,q.y),0.0));
        float d1=distanceToEdge/.065, d2=distanceToEdge/.14;
        float glow=exp(-min(40.0,d1*d1))*.48+exp(-min(40.0,d2*d2))*.12;
        gl_FragColor=vec4(vec3(1.0,.30,.008),glow*fade*(1.0+flash));
        #include <colorspace_fragment>
      }`
  });
  // Make the panels curved in 3D, with gently clipped corners.
  function panelPoint(u,v) {
    const theta=(u-.5)*(span-.18*Math.pow(Math.min(1,Math.abs(v-.5)*2),8));
    return new T.Vector3(radius*Math.sin(theta),(v-.5)*tall,radius*(Math.cos(theta)-1));
  }
  const vertices=[],uvs=[],indices=[];
  const columns=40,rows=8;
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns,v=row/rows,p=panelPoint(u,v);
    vertices.push(p.x,p.y,p.z);uvs.push(u,v);
    if(row<rows&&col<columns){const n=row*(columns+1)+col;indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);}
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  // Broad curved gold ribbons have a visible bevel, rather than wire outlines.
  const framePositions=[],frameUvs=[],frameIndices=[];
  function frameStrip(u0,u1,v0,v1,steps){
    const start=framePositions.length/3;
    for(let i=0;i<=steps;i++)for(let side=0;side<2;side++){
      const u=u0+(u1-u0)*i/steps,v=side?v1:v0,p=panelPoint(u,v);
      const theta=Math.atan2(p.x,p.z+radius);
      // Raised edges catch direct light; inner seam slopes into the glass.
      const lift=side===0?.016:.029;
      p.x+=Math.sin(theta)*lift;p.z+=Math.cos(theta)*lift;
      framePositions.push(p.x,p.y,p.z);frameUvs.push(u,v);
      if(i<steps){const n=start+i*2;frameIndices.push(n,n+1,n+2,n+1,n+3,n+2);}
    }
  }
  frameStrip(0,1,0,.105,40);frameStrip(0,1,.895,1,40);
  frameStrip(0,.035,.105,.895,3);frameStrip(.965,1,.105,.895,3);
  const frameGeometry=new T.BufferGeometry();
  frameGeometry.setAttribute('position',new T.Float32BufferAttribute(framePositions,3));
  frameGeometry.setAttribute('uv',new T.Float32BufferAttribute(frameUvs,2));
  frameGeometry.setIndex(frameIndices);frameGeometry.computeVertexNormals();
  const tabPositions=[],tabIndices=[];
  for(const points of [
    [[.04,.89],[.20,.89],[.17,.73],[.09,.73]],
    [[.72,.10],[.93,.10],[.88,.27],[.78,.27],[.75,.19],[.68,.19]],
    [[.34,.91],[.46,.91],[.49,.98],[.37,.98]]
  ]){
    const start=tabPositions.length/3;
    for(const [u,v]of points){const p=panelPoint(u,v),angle=Math.atan2(p.x,p.z+radius);p.x+=Math.sin(angle)*.034;p.z+=Math.cos(angle)*.034;tabPositions.push(p.x,p.y,p.z);}
    for(let i=1;i<points.length-1;i++)tabIndices.push(start,start+i,start+i+1);
  }
  const tabGeometry=new T.BufferGeometry();
  tabGeometry.setAttribute('position',new T.Float32BufferAttribute(tabPositions,3));tabGeometry.setIndex(tabIndices);tabGeometry.computeVertexNormals();
  const glowPositions=[],glowUvs=[],glowIndices=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns*1.26-.13,v=row/rows*1.40-.20,p=panelPoint(u,v);
    glowPositions.push(p.x,p.y,p.z);glowUvs.push(u,v);
    if(row<rows&&col<columns){const n=row*(columns+1)+col;glowIndices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);}
  }
  const glowGeometry=new T.BufferGeometry();
  glowGeometry.setAttribute('position',new T.Float32BufferAttribute(glowPositions,3));
  glowGeometry.setAttribute('uv',new T.Float32BufferAttribute(glowUvs,2));glowGeometry.setIndex(glowIndices);
  const border=[];
  for(let i=0;i<33;i++)border.push(panelPoint(i/32,1));
  for(let i=1;i<=8;i++)border.push(panelPoint(1,1-i/8));
  for(let i=1;i<=32;i++)border.push(panelPoint(1-i/32,0));
  for(let i=1;i<8;i++)border.push(panelPoint(0,i/8));
  const borderPath=new T.CatmullRomCurve3(border,true,'centripetal');
  const rimGeometry=new T.TubeGeometry(borderPath,112,.020,6,true);
  const coreGeometry=new T.TubeGeometry(borderPath,112,.006,4,true);
  // Small camera-facing glints put a bright core inside the soft amber spill.
  const glintPixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const dx=(x-15.5)/15.5,dy=(y-15.5)/15.5,r=dx*dx+dy*dy,n=(y*32+x)*4;
    const cross=Math.exp(-dx*dx*170-dy*dy*12)+Math.exp(-dy*dy*170-dx*dx*12);
    glintPixels[n]=255;glintPixels[n+1]=205;glintPixels[n+2]=112;
    glintPixels[n+3]=Math.round(Math.min(1,Math.exp(-r*8)*.72+cross*.25)*255);
  }
  const glintMap=new T.DataTexture(glintPixels,32,32);glintMap.colorSpace=T.SRGBColorSpace;glintMap.needsUpdate=true;
  const glintMaterial=new T.SpriteMaterial({map:glintMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  const panels=Array.from({length:3},(_,i)=>{
    const pivot=new T.Group();pivot.name='guard-panel-'+i;root.add(pivot);
    const face=new T.Mesh(geometry,surface);face.name='guard-hex-surface';face.renderOrder=2;pivot.add(face);
    const glow=new T.Mesh(glowGeometry,haloMaterial);glow.name='guard-soft-glow';glow.renderOrder=1;pivot.add(glow);
    const frame=new T.Mesh(frameGeometry,edgeMaterial);frame.name='guard-gold-frame';frame.renderOrder=3;pivot.add(frame);
    const tabs=new T.Mesh(tabGeometry,edgeMaterial);tabs.name='guard-gold-tabs';tabs.renderOrder=3;pivot.add(tabs);
    pivot.add(new T.Mesh(rimGeometry,edgeMaterial));
    pivot.add(new T.Mesh(coreGeometry,coreMaterial));
    for(const [u,v]of [[.16,1],[.86,0]]){
      const glint=new T.Sprite(glintMaterial);glint.name='guard-edge-glint';
      glint.position.copy(panelPoint(u,v));glint.position.z+=.025;glint.scale.setScalar(.16);pivot.add(glint);
    }
    return {pivot,angle:i*Math.PI*2/3,start:new T.Vector3(),turn:new T.Quaternion(),direction:new T.Vector3()};
  });
  const trailMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{fade:{value:1}},
    vertexShader:`varying vec2 trailUv;void main(){trailUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 trailUv;uniform float fade;void main(){
      float tx=clamp(trailUv.x,0.0,1.0);
      float t3=tx*tx*tx, t6=t3*t3, head=t6*t6;
      gl_FragColor=vec4(mix(vec3(1.0,.25,.005),vec3(1.0,.85,.42),head),(.06+t3*.55)*fade);
      #include <colorspace_fragment>
    }`});
  const trails=new T.Group();trails.name='guard-orbit-trails';root.add(trails);
  for(let ring=0;ring<2;ring++){
    const points=[];
    for(let i=0;i<=80;i++){
      const angle=i/80*Math.PI*1.65+ring*Math.PI;
      points.push(new T.Vector3(Math.sin(angle)*1.13,(ring?-.29:.24)+Math.sin(angle*2)*.035,Math.cos(angle)*1.13));
    }
    const curve=new T.CatmullRomCurve3(points);
    trails.add(new T.Mesh(new T.TubeGeometry(curve,80,.008,4,false),trailMaterial));
  }
  const sparkMaterial=new T.MeshBasicMaterial({color:0xffdc74,transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending});
  const sparkGeometry=new T.BoxGeometry(.012,.035,.012);
  const sparks=Array.from({length:16},(_,i)=>{
    const mesh=new T.Mesh(sparkGeometry,sparkMaterial);mesh.rotation.z=i*2.4;root.add(mesh);return mesh;
  });
  const rigs=new WeakMap(),centre=new T.Vector3(),inverse=new T.Matrix4();
  let previousShield=false,previousTime=0,activation=-10,impact=-10;
  function follow(model){
    let spine=rigs.get(model);
    if(!spine){model.traverse(o=>{if(o.isBone&&o.name.endsWith('Spine1'))spine=o;});if(spine)rigs.set(model,spine);}
    if(!spine)return;
    runner.updateWorldMatrix(true,true);
    inverse.copy(runner.matrixWorld).invert();
    spine.getWorldPosition(centre).applyMatrix4(inverse);
    root.position.copy(centre);
    // Keep the protection ring upright while the character moves inside it.
    root.quaternion.identity();
  }
  return function updateGuard(s,model){
    const time=s.time,reset=time<previousTime||time===0;
    if(reset){previousShield=false;activation=impact=-10;root.visible=false;}
    const active=Boolean(s.shield || s.slots?.some(slot => slot.id === 'shield' && slot.until > s.time));
    if(active&&!previousShield){activation=time;impact=-10;}
    // UI consumes shieldAbsorbed before render; preserve the hit through the transition.
    if(!reset&&previousShield&&!active&&s.hit>0){
      impact=time;
      for(const p of panels){p.start.copy(p.pivot.position);p.turn.copy(p.pivot.quaternion);p.direction.copy(p.start).setY(.3).normalize();}
    }
    const age=time-activation,hitAge=time-impact,breaking=!active&&hitAge>=0&&hitAge<.65;
    if(active&&model)follow(model);
    root.visible=Boolean(model?.visible&&(active||breaking));
    const fade=breaking?Math.max(0,1-hitAge/.65):1;
    const flash=breaking?Math.max(0,1-hitAge/.18):Math.max(0,1-age/.5)*.5;
    surface.uniforms.flash.value=flash;surface.uniforms.fade.value=fade;
    edgeMaterial.opacity=fade;edgeMaterial.emissiveIntensity=.8+flash*1.5;coreMaterial.opacity=fade;
    haloMaterial.uniforms.fade.value=fade;haloMaterial.uniforms.flash.value=flash;trailMaterial.uniforms.fade.value=fade;
    glintMaterial.opacity=fade*(.85+flash*.15);
    for(let i=0;i<panels.length;i++){
      const p=panels[i],pivot=p.pivot;
      if(breaking){
        pivot.position.copy(p.start).addScaledVector(p.direction,hitAge*2.4);
        pivot.position.y-=hitAge*hitAge*1.4;
        pivot.quaternion.copy(p.turn);pivot.rotateZ(hitAge*(i%2?3:-3));
        pivot.scale.setScalar(fade);pivot.visible=true;
      }else{
        const progress=T.MathUtils.clamp((age-i*.045)/.45,0,1);
        const angle=p.angle+time*.32,spread=radius+(1-progress)*.55;
        pivot.position.set(Math.sin(angle)*spread,(i===0?-.16:.10)+Math.sin(time*1.7+i)*.035,Math.cos(angle)*spread);
        pivot.rotation.set(0,angle,0);pivot.scale.setScalar(.45+progress*.55);pivot.visible=active&&progress>0;
      }
    }
    trails.visible=active||breaking;trails.rotation.y=-time*.52;
    const burstAge=breaking?hitAge:age,burst=T.MathUtils.clamp(1-burstAge/.6,0,1);
    sparkMaterial.opacity=fade*(.5+burst*.5);
    for(let i=0;i<sparks.length;i++){
      const angle=i*Math.PI*2/sparks.length+time*(i%2?.75:-.4);
      const r=breaking?radius+hitAge*2:1.10+Math.sin(i*4+time)*.045;
      sparks[i].visible=active||breaking;
      sparks[i].position.set(Math.sin(angle)*r,Math.sin(i*2.4+time*.8)*.32,Math.cos(angle)*r);
      sparks[i].scale.setScalar((.3+.7*Math.pow(Math.sin(time*2+i),8)+burst*.5)*fade);
    }
    previousShield=active;previousTime=time;
  };
}

// Shared, reusable geometry/materials for the pooled pickup models.
export function createGuardPickup() {
  const shape = new T.Shape();
  shape.moveTo(0, -.48);
  shape.bezierCurveTo(-.16, -.39, -.38, -.16, -.38, .12);
  shape.lineTo(-.38, .35);
  shape.quadraticCurveTo(0, .56, .38, .35);
  shape.lineTo(.38, .12);
  shape.bezierCurveTo(.38, -.16, .16, -.39, 0, -.48);
  const rim = new T.ExtrudeGeometry(shape, { depth: .085, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 3, steps: 1, curveSegments: 16 });
  const contour=shape.getPoints(24);
  if(contour[0].distanceTo(contour[contour.length-1])<.00001)contour.pop();
  if(T.ShapeUtils.isClockWise(contour))contour.reverse();
  const facePoints=[0,0,.07],faceIndices=[],sides=contour.length;
  for(let ring=1;ring<=4;ring++)for(const point of contour){
    const x=point.x*ring/4,y=point.y*ring/4;
    facePoints.push(x,y,.07*Math.max(0,1-Math.pow(x/.4,2)-Math.pow(y/.54,2)));
  }
  for(let i=0;i<sides;i++)faceIndices.push(0,1+i,1+(i+1)%sides);
  for(let ring=0;ring<3;ring++)for(let i=0;i<sides;i++){
    const a=1+ring*sides+i,b=1+ring*sides+(i+1)%sides,c=a+sides,d=b+sides;
    faceIndices.push(a,c,b,b,c,d);
  }
  const face=new T.BufferGeometry();face.setAttribute('position',new T.Float32BufferAttribute(facePoints,3));face.setIndex(faceIndices);face.computeVertexNormals();
  const gold = new T.MeshStandardMaterial({ color: 0xc3912f, metalness: .94, roughness: .24, envMap:coinReflections(), envMapIntensity:.55 });
  const enamel = new T.MeshStandardMaterial({ color: 0x052a20, metalness: .6, roughness: .3, envMap:coinReflections(),envMapIntensity:.25 });
  const emblem = new T.BoxGeometry(.075, .23, .035);
  return function addGuardPickup(parent) {
    const group = new T.Group();
    group.name='shield-pickup';
    group.position.y = 1.25;
    group.scale.setScalar(0.82);
    parent.add(group);
    const frame = new T.Mesh(rim, gold);
    frame.position.z = -.0425;
    frame.castShadow = true;
    group.add(frame);
    for (const side of [-1, 1]) {
      const inset = new T.Mesh(face, enamel);
      inset.scale.setScalar(.82);
      inset.position.z = side * .073;
      inset.rotation.y = side < 0 ? Math.PI : 0;
      group.add(inset);
      for(const arm of [-1,1]){
        const chevron=new T.Mesh(emblem,gold);chevron.position.set(arm*.067,.02,side*.17);chevron.rotation.z=-arm*.65;group.add(chevron);
      }
    }
    const glint=makePickupGlint();glint.position.set(-.24,.32,.15);group.add(glint);group.userData.glint=glint;
    return group;
  };
}
