import {campusMaterial, roadsideTree} from './street-materials.js';
import {buildBus} from './bus-model.js';
import { BoxGeometry, CanvasTexture, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SRGBColorSpace } from './vendor/three.module.js';
import { SCHOOL_GATE, SCHOOL_VAN, ROOF_COINS } from './engine.js';

export function createSchoolEntrance(scene) {
  const campus = new Group();
  scene.add(campus);
  const box = new BoxGeometry(), wheel = new CylinderGeometry(1,1,1,18);
  const materials = new Map();
  function part(parent, color, x, y, z, width, height, length, geometry = box) {
    if (!materials.has(color)) materials.set(color, campusMaterial(color));
    const mesh = new Mesh(geometry, materials.get(color));
    mesh.position.set(x,y,z);
    mesh.scale.set(width,height,length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function sign(parent, headline, subline, x, y, z, width, height) {
    const board = part(parent,0x113c48,x,y,z,width,height,.20);
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width=1024;
    canvas.height=256;
    const draw=canvas.getContext('2d');
    if (!draw) return;
    draw.fillStyle='#153c47';
    draw.fillRect(0,0,1024,256);
    draw.strokeStyle='#91dbc0';
    draw.lineWidth=8;
    draw.strokeRect(16,16,992,224);
    draw.textAlign='center';
    draw.fillStyle='#f7f3d8';
    draw.font='900 94px system-ui';
    draw.fillText(headline,512,121,944);
    draw.fillStyle='#a7e8cc';
    draw.font='700 49px system-ui';
    draw.fillText(subline,512,196,940);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace=SRGBColorSpace;
    const ink = new MeshStandardMaterial({map:texture, emissiveMap:texture, emissive:0xffffff,emissiveIntensity:.18,roughness:.84});
    const face = new Mesh(box, ink);
    face.position.set(x,y,z+.105);
    face.scale.set(width-.03,height-.03,.012);
    board.parent.add(face);
  }

  for (const side of [-1, 1]) {
    roadsideTree(campus, side*6.8, -4-side*2, 6.3, side===1, side*.26);
    roadsideTree(campus, side*12.4, -10, 9, true, side*.18);
    roadsideTree(campus, side*7.5, -38-side*2, 7.5, false, side*.36);
    roadsideTree(campus, side*16, -30, 10, false, -side*.35);
  }
  const gate = -SCHOOL_GATE;
  for (const side of [-1,1]) {
    const x=side*4.04;
    part(campus,0xffedc7,x,2.36,gate,.66,4.72,.86);
    part(campus,0x168e85,x,.31,gate,.85,.47,1.04);
    part(campus,0x168e85,x,4.53,gate,.90,.38,1.08);
    part(campus,0xc87056,side*7.3,.55,gate,5.86,1.08,.57);
    part(campus,0xf9e4bd,side*7.3,1.13,gate,5.95,.15,.70);
    for(let i=0;i<8;i++){
      part(campus,0x28545b,side*(4.62+i*.66),1.66,gate,.075,1.0,.075);
    }
    part(campus,0x28545b,side*6.98,2.11,gate,5.18,.08,.10);
  }
  sign(campus,'LMSK HIGHER SECONDARY SCHOOL','MAIN ENTRANCE · LIFE RUSH',0,4.45,gate,8.05,1.24);
  part(campus,0xfff2c8,0,5.14,gate,8.98,.20,1.14);
  for(let i=0;i<9;i++) part(campus,0xfff0cc,-2.97+i*.74,.103,gate+1.85,.37,.022,1.05);

  // Low campus wings flank an open three-lane entrance.
  for(const side of [-1,1]){
    const x=side*9.15,z=-25;
    part(campus,0xf3bc88,x,2.33,z,8.15,4.65,20.6);
    part(campus,0x216c6c,x,4.76,z,8.43,.30,20.8);
    part(campus,0xffe4b7,x,4.96,z,8.49,.13,21);
    const front=-14.66;
    for(const y of [1.65,3.48])for(const offset of [-2.74,-1.2,1.2,2.74]){
      part(campus,0xffedc8,x+offset,y,front,1.02,1.03,.10);
      part(campus,0x537f91,x+offset,y,front+.063,.86,.83,.045);
      part(campus,0xe0ece2,x+offset,y,front+.091,.06,.83,.02);
    }
    if(side===-1) sign(campus,'SCHOOL OFFICE','CAMPUS ENTRY',x,3.30,front,3.22,.73);
    const inner=x-side*4.09;
    for(let j=0;j<7;j++){
      const z=-16-j*2.76;
      part(campus,0xf9e7be,inner,3.41,z,.12,1.15,1.63);
      part(campus,0x55788d,inner-side*.08,3.42,z,.075,.87,1.33);
      part(campus,0xffdeb0,inner-side*.22,1.12,z-.62,.38,2.25,.38);
    }
    part(campus,0x44897e,inner-side*.62,2.44,-25,1.25,.21,20.5);
    for(let j=0;j<4;j++){
      const z=-18-j*5.1;
      part(campus,0xc78456,side*4.40,.21,z,.80,.42,1.49);
      part(campus,0x418967,side*4.40,.52,z,.65,.30,1.32);
    }
  }
  sign(campus,'PICKUP ZONE','RAMP  ·  RIGHT LANE',4.54,2.72,-33,2.36,.74);
  part(campus,0x315763,4.54,1.29,-33,.10,2.58,.10);
  for(const mark of [16,18,20]){
    for(const side of [-1,1]){
      part(campus,0xffd663,2.2+side*.23,.111,-mark,.13,.022,.68).rotation.y=side*.65;
    }
  }

  const vehicle=new Group();vehicle.userData.captureObstacle=true;campus.add(vehicle);
  const van = SCHOOL_VAN, x = van.lane*2.2, length = van.front-van.rear;
  const mid=-(van.front+van.rear)/2, rear=-van.rear;
  const road=.09, roof=road+van.roof;
  const body=buildBus(length,van.roof,false);body.position.set(x,road,rear);vehicle.add(body);

  const run=van.rear-van.ramp, slope=Math.atan2(van.roof,run);
  const ramp=part(vehicle,0x327a75,x,road+van.roof/2-.06,-(van.ramp+van.rear)/2,van.width,.12,Math.hypot(run,van.roof));
  ramp.rotation.x=slope;
  for(let j=1;j<=7;j++){
    const t=j/8;
    const stripe=part(vehicle,j%2?0xf8db79:0xe6f5db,x,road+van.roof*t+.019,-(van.ramp+run*t),van.width-.19,.034,.088);
    stripe.rotation.x=slope;
  }
  const coinGeo = new CylinderGeometry(.19,.19,.072,20);
  const coins=ROOF_COINS.map(distance=>{
    const coin=part(vehicle,0xffc428,x,roof+.58,-distance,1,1,1,coinGeo);
    coin.rotation.x=Math.PI/2;
    coin.castShadow=false;
    return coin;
  });
  return state=>{
    campus.position.z=state.distance;
    campus.visible=state.distance<82;
    coins.forEach((coin,i)=>{
      coin.visible=!(state.roofCoins & (1<<i));
      coin.rotation.z=state.time*3+i*.38;
      coin.position.y=roof+.58+.06*Math.sin(state.time*4+i*.8);
    });
  };
}
