import {makeCoin,spinCoin} from './coin.js';
import {campusMaterial, roadsideTree, curveRelX, curveRelY} from './street-materials.js';
import {buildBus, buildCollegeVehicle} from './bus-model.js';
import {buildRedShuttleCart} from './itpark-models.js?v=3.0.3';
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
    part(parent,0x94a3b8,x,y,z-.01,width+.12,height+.12,.14);
    const board = part(parent,0x0f2534,x,y,z,width,height,.18);
    // Brushed aluminum top & bottom trim moldings and top floodlight brackets
    part(parent,0xdbe6ef,x,y+height/2+.04,z+.02,width+.14,.07,.22);
    part(parent,0xdbe6ef,x,y-height/2-.04,z+.02,width+.14,.07,.22);
    for (const lx of [x-width*.32, x+width*.32]) {
      part(parent,0x1e293b,lx,y+height/2+.16,z+.24,.06,.06,.38);
      part(parent,0xfef3c7,lx,y+height/2+.13,z+.40,.22,.07,.10);
    }
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width=1024;
    canvas.height=256;
    const draw=canvas.getContext('2d');
    if (!draw) return;
    const grad = draw.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#0f2d3f');
    grad.addColorStop(.5,'#154150');
    grad.addColorStop(1,'#0b2230');
    draw.fillStyle=grad;
    draw.fillRect(0,0,1024,256);
    draw.strokeStyle='#fbbf24';
    draw.lineWidth=10;
    draw.strokeRect(14,14,996,228);
    draw.strokeStyle='#91dbc0';
    draw.lineWidth=4;
    draw.strokeRect(26,26,972,204);
    for (const [rx,ry] of [[42,42],[982,42],[42,214],[982,214]]) {
      draw.fillStyle='#cbd5e1'; draw.beginPath(); draw.arc(rx,ry,7,0,Math.PI*2); draw.fill();
    }
    draw.textAlign='center';
    draw.shadowColor='rgba(0,0,0,0.55)'; draw.shadowBlur=10; draw.shadowOffsetY=4;
    draw.fillStyle='#fff9e2';
    draw.font='900 88px system-ui';
    draw.fillText(headline,512,118,920);
    draw.shadowBlur=0; draw.shadowOffsetY=0;
    draw.fillStyle='#8ef0c8';
    draw.font='700 44px system-ui';
    draw.fillText(subline,512,192,920);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace=SRGBColorSpace;
    const ink = new MeshStandardMaterial({map:texture, emissiveMap:texture, emissive:0xffffff,emissiveIntensity:.24,roughness:.42,metalness:.08});
    const face = new Mesh(box, ink);
    face.position.set(x,y,z+.10);
    face.scale.set(width-.02,height-.02,.014);
    board.parent.add(face);
  }

  for (const side of [-1, 1]) {
    roadsideTree(campus, side*6.8, -4-side*2, 6.3, side===1, side*.26);
    roadsideTree(campus, side*12.4, -10, 9, true, side*.18);
    roadsideTree(campus, side*7.5, -38-side*2, 7.5, false, side*.36);
    roadsideTree(campus, side*16, -30, 10, false, -side*.35);
  }
  const gate = -SCHOOL_GATE;
  const schoolSigns=new Group(),collegeSigns=new Group();
  const parkSigns=new Group(),classicWings=new Group(),parkWings=new Group();
  campus.add(schoolSigns,collegeSigns,parkSigns,classicWings,parkWings);
  sign(parkSigns,'LMSK IT PARK','TECHNOLOGY DISTRICT',0,4.45,gate,8.05,1.24);
  for (const side of [-1,1]) {
    const x=side*4.04;
    part(classicWings,0xffedc7,x,2.36,gate,.66,4.72,.86);
    part(classicWings,0x168e85,x,.31,gate,.85,.47,1.04);
    part(classicWings,0x168e85,x,4.53,gate,.90,.38,1.08);
    part(classicWings,0xc87056,side*7.3,.55,gate,5.86,1.08,.57);
    part(classicWings,0xf9e4bd,side*7.3,1.13,gate,5.95,.15,.70);
    for(let i=0;i<8;i++){
      part(classicWings,0x28545b,side*(4.62+i*.66),1.66,gate,.075,1.0,.075);
    }
    part(classicWings,0x28545b,side*6.98,2.11,gate,5.18,.08,.10);

    // Sleek modern white-concrete & dark-steel IT Park entrance arch pillars & glass security wall
    part(parkWings,0xf1f4f8,x,2.45,gate,.72,4.90,.92);
    part(parkWings,0x3b434c,x,.32,gate,.88,.48,1.08);
    part(parkWings,0x3b434c,x,4.62,gate,.94,.34,1.10);
    part(parkWings,0x63acc2,x-side*.37,2.45,gate,.06,4.1,.42);
    part(parkWings,0xd8dee6,side*7.3,.46,gate,5.86,.92,.54);
    part(parkWings,0x3b434c,side*7.3,1.45,gate,5.80,1.05,.12);
    part(parkWings,0x63acc2,side*7.3,1.45,gate+.03,5.55,.84,.08);
  }
  sign(schoolSigns,'LMSK HIGHER SECONDARY SCHOOL','MAIN ENTRANCE · LIFE RUSH',0,4.45,gate,8.05,1.24);
  sign(collegeSigns,'LMSK COLLEGE CAMPUS','MAIN ENTRANCE · LIFE RUSH',0,4.45,gate,8.05,1.24);
  part(classicWings,0xfff2c8,0,5.14,gate,8.98,.20,1.14);
  part(parkWings,0xf1f4f8,0,5.16,gate,9.10,.26,1.20);
  part(parkWings,0x3b434c,0,5.34,gate,8.90,.12,1.02);
  for(let i=0;i<9;i++) part(campus,0xfff0cc,-2.97+i*.74,.103,gate+1.85,.37,.022,1.05);

  // Low campus wings flank an open three-lane entrance (classic masonry for School/College; sleek glass IT Park pavilions for IT Park).
  for(const side of [-1,1]){
    const x=side*9.15,z=-25;
    part(classicWings,0xf3bc88,x,2.33,z,8.15,4.65,20.6);
    part(classicWings,0x216c6c,x,4.76,z,8.43,.30,20.8);
    part(classicWings,0xffe4b7,x,4.96,z,8.49,.13,21);
    const front=-14.66;
    for(const y of [1.65,3.48])for(const offset of [-2.74,-1.2,1.2,2.74]){
      part(classicWings,0xffedc8,x+offset,y,front,1.02,1.03,.10);
      part(classicWings,0x537f91,x+offset,y,front+.063,.86,.83,.045);
      part(classicWings,0xe0ece2,x+offset,y,front+.091,.06,.83,.02);
    }
    if(side===-1){sign(schoolSigns,'SCHOOL OFFICE','CAMPUS ENTRY',x,3.30,front,3.22,.73);sign(collegeSigns,'COLLEGE OFFICE','CAMPUS ENTRY',x,3.30,front,3.22,.73);sign(parkSigns,'TECH RECEPTION','INNOVATION GATE',x,4.25,front+.1,3.55,.76);}
    const inner=x-side*4.09;
    for(let j=0;j<7;j++){
      const z=-16-j*2.76;
      part(classicWings,0xf9e7be,inner,3.41,z,.12,1.15,1.63);
      part(classicWings,0x55788d,inner-side*.08,3.42,z,.075,.87,1.33);
      part(classicWings,0xffdeb0,inner-side*.22,1.12,z-.62,.38,2.25,.38);
    }
    part(classicWings,0x44897e,inner-side*.62,2.44,-25,1.25,.21,20.5);
    for(let j=0;j<4;j++){
      const z=-18-j*5.1;
      part(classicWings,0xc78456,side*4.40,.21,z,.80,.42,1.49);
      part(classicWings,0x418967,side*4.40,.52,z,.65,.30,1.32);
    }

    // Modern IT Park glass-and-white cantilevered reception pavilions flanking the entry boulevard
    part(parkWings,0xb6bec8,x,.11,z,9.8,.22,22.4);
    part(parkWings,0xf1f4f8,x+side*.35,4.1,z,7.8,8.0,20.6);
    part(parkWings,0x63acc2,inner-side*.06,4.0,z,.24,7.4,19.8);
    part(parkWings,0x63acc2,x,4.0,front+.05,7.4,7.4,.24);
    for(const slabY of [2.7,5.4,8.1]){
      part(parkWings,0xf1f4f8,x-side*.22,slabY,z,8.8,.38,21.4);
    }
    for(let j=0;j<7;j++){
      const mz=-15.5-j*3.1;
      part(parkWings,0x3b434c,inner-side*.26,4.0,mz,.24,7.9,.22);
    }
    for(const mx of [-2.8,-.9,.9,2.8]){
      part(parkWings,0x3b434c,x+mx,4.0,front+.22,.22,7.9,.24);
    }
    for(let j=0;j<4;j++){
      const pz=-18-j*5.1;
      part(parkWings,0xf1f4f8,side*4.40,.24,pz,.88,.44,1.65);
      part(parkWings,0x3ea64f,side*4.40,.54,pz,.72,.28,1.46);
    }
  }
  parkWings.visible=false;
  sign(campus,'PICKUP ZONE','FIND THE ROOF RAMP',4.54,2.72,-33,2.36,.74);
  part(campus,0x315763,4.54,1.29,-33,.10,2.58,.10);
  const vehicle=new Group();vehicle.name='entry-vehicle';vehicle.userData.captureObstacle=true;campus.add(vehicle);
  for(const mark of [16,18,20]){
    for(const side of [-1,1]){
      part(vehicle,0xffd663,2.2+side*.23,.111,-mark,.13,.022,.68).rotation.y=side*.65;
    }
  }

  const van = SCHOOL_VAN, x = van.lane*2.2, length = van.front-van.rear;
  const mid=-(van.front+van.rear)/2, rear=-van.rear;
  const road=.09, roof=road+van.roof;
  const body=buildBus(length,van.roof,false);body.name='entry-bus';body.position.set(x,road,rear);vehicle.add(body);
  const collegeBody=buildCollegeVehicle('van',length,van.roof,false);collegeBody.name='entry-college-van';collegeBody.position.set(x,road,rear);collegeBody.visible=false;vehicle.add(collegeBody);
  const parkBody=buildRedShuttleCart(length,van.roof);parkBody.name='entry-itpark-shuttle';parkBody.position.set(x,road,rear);parkBody.visible=false;vehicle.add(parkBody);

  const run=van.rear-van.ramp, slope=Math.atan2(van.roof,run);
  const ramp=part(vehicle,0x327a75,x,road+van.roof/2-.06,-(van.ramp+van.rear)/2,van.width,.12,Math.hypot(run,van.roof));
  ramp.name='entry-ramp';
  ramp.rotation.x=slope;
  for(let j=1;j<=7;j++){
    const t=j/8;
    const stripe=part(vehicle,j%2?0xf8db79:0xe6f5db,x,road+van.roof*t+.019,-(van.ramp+run*t),van.width-.19,.034,.088);
    stripe.rotation.x=slope;
  }
  const coins=ROOF_COINS.map(distance=>makeCoin(vehicle,x,roof+.58,-distance));
  return state=>{
    const isCollege=state.map==='college';
    const isPark=state.map==='itpark';
    campus.position.set(curveRelX(0,state),curveRelY(0,state),state.distance);
    parkSigns.visible=isPark;parkWings.visible=isPark;
    classicWings.visible=!isPark;
    schoolSigns.visible=!isCollege&&!isPark;collegeSigns.visible=isCollege;
    body.visible=!isCollege&&!isPark;collegeBody.visible=isCollege;parkBody.visible=isPark;
    const entry=state.entryVan??SCHOOL_VAN;
    vehicle.position.set((entry.lane-SCHOOL_VAN.lane)*2.2,0,SCHOOL_VAN.rear-entry.rear);
    campus.visible=state.distance<entry.front+28;
    coins.forEach((coin,i)=>{
      coin.visible=!(state.roofCoins & (1<<i));
      spinCoin(coin,state.time,i,roof+.58);
    });
  };
}
