import * as T from './vendor/three.module.js';
import {coinReflections,makeCoin,makePickupGlint,spinCoin} from './coin.js';
import {createGuardPickup} from './guard-effect.js';

export function createPickupModels() {
  const chrome=new T.MeshStandardMaterial({color:0xcbd4df,metalness:.95,roughness:.19,envMap:coinReflections(),envMapIntensity:.65});
  const red=new T.MeshStandardMaterial({color:0x970d10,metalness:.62,roughness:.23,envMap:coinReflections(),envMapIntensity:.35});
  const body=new T.Shape();
  body.moveTo(-.34,.30);body.lineTo(-.34,-.04);
  body.absarc(0,-.04,.34,Math.PI,Math.PI*2,false);
  body.lineTo(.34,.30);body.lineTo(.15,.30);body.lineTo(.15,-.04);
  body.absarc(0,-.04,.15,Math.PI*2,Math.PI,true);
  body.lineTo(-.15,.30);body.closePath();
  const bodyGeometry=new T.ExtrudeGeometry(body,{depth:.15,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,curveSegments:24,steps:1});
  bodyGeometry.translate(0,0,-.075);
  const capGeometry=new T.BoxGeometry(.205,.15,.19,1,1,1);
  const ringGeometry=new T.TorusGeometry(.44,.008,4,40);
  const fieldMaterials=Array.from({length:2},()=>new T.MeshBasicMaterial({color:0xffad57,transparent:true,opacity:.2,depthWrite:false,blending:T.AdditiveBlending}));
  const addShield=createGuardPickup();
  function add(parent,type) {
    delete parent.userData.pickupVisual;
    if(type==='coin'){
      const coin=makeCoin(parent,0,1.1,0);parent.userData.pickupVisual=coin;return;
    }
    if(type==='shield'){
      parent.userData.pickupVisual=addShield(parent);return;
    }
    if(type!=='magnet')return;
    const magnet=new T.Group();magnet.name='magnet-pickup';magnet.position.y=1.25;parent.add(magnet);
    const shell=new T.Mesh(bodyGeometry,red);shell.castShadow=true;magnet.add(shell);
    for(const side of [-1,1]){
      const pole=new T.Mesh(capGeometry,chrome);pole.position.set(side*.245,.34,0);pole.castShadow=true;magnet.add(pole);
    }
    const glint=makePickupGlint();glint.position.set(-.25,.39,.12);magnet.add(glint);
    const fields=[];
    for(let i=0;i<2;i++){
      const ring=new T.Mesh(ringGeometry,fieldMaterials[i]);ring.rotation.x=-Math.PI/2;ring.position.y=-.43;magnet.add(ring);fields.push(ring);
    }
    magnet.userData.fields=fields;magnet.userData.glint=glint;
    parent.userData.pickupVisual=magnet;
  }
  function animate(parent,type,time,phase=0) {
    const model=parent.userData.pickupVisual;if(!model)return;
    parent.rotation.y=0;
    if(type==='coin'){spinCoin(model,time,phase,1.1);return;}
    model.rotation.set(Math.sin(time*1.8+phase)*.08,.30+Math.sin(time*1.4+phase)*.38,Math.sin(time*2+phase)*.07);
    model.userData.fields?.forEach((ring,i)=>{const p=(time*.8+i*.5)%1;ring.scale.setScalar(.8+p*.8);ring.material.opacity=(1-p)*.27;});
    model.userData.glint?.scale.setScalar(.04+.12*Math.pow(Math.max(0,Math.sin(time*2.8+phase)),8));
  }
  return {add,animate};
}

// Shaded vector silhouettes for devices using the Canvas renderer.
export function drawLitePowerup(ctx,p,type,time) {
  const k=p.k;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(time*1.8)*.07);ctx.lineJoin='round';
  const shine=ctx.createLinearGradient(-.4*k,-.5*k,.35*k,.5*k);
  shine.addColorStop(0,'#fff3bb');shine.addColorStop(.35,'#e9af35');shine.addColorStop(.58,'#fff3b1');shine.addColorStop(1,'#aa6720');
  if(type==='magnet'){
    ctx.strokeStyle='#76171d';ctx.lineWidth=.24*k;ctx.beginPath();ctx.moveTo(-.25*k,-.3*k);ctx.lineTo(-.25*k,.02*k);ctx.arc(0,.02*k,.25*k,Math.PI,0,true);ctx.lineTo(.25*k,-.3*k);ctx.stroke();
    ctx.strokeStyle='#e83c30';ctx.lineWidth=.16*k;ctx.stroke();
    ctx.fillStyle='#e7eef3';for(const side of [-1,1])ctx.fillRect((side*.25-.105)*k,-.4*k,.21*k,.15*k);
  }else{
    const shieldPath=()=>{ctx.beginPath();ctx.moveTo(0,-.46*k);ctx.lineTo(.38*k,-.28*k);ctx.quadraticCurveTo(.39*k,.24*k,0,.5*k);ctx.quadraticCurveTo(-.39*k,.24*k,-.38*k,-.28*k);ctx.closePath();};
    ctx.fillStyle=shine;shieldPath();ctx.fill();
    ctx.save();ctx.scale(.77,.77);ctx.fillStyle='#23473c';shieldPath();ctx.fill();ctx.restore();
    ctx.strokeStyle='#ffdb7b';ctx.lineWidth=.065*k;ctx.beginPath();ctx.moveTo(-.13*k,-.04*k);ctx.lineTo(0,.10*k);ctx.lineTo(.13*k,-.04*k);ctx.stroke();
  }
  ctx.restore();
}
