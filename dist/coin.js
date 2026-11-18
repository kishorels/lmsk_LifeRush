import {
  CanvasTexture, CylinderGeometry, Mesh, MeshStandardMaterial, SRGBColorSpace
} from './vendor/three.module.js';

let faceCanvas, geometry, materials;

function coinFace() {
  if (faceCanvas) return faceCanvas;
  faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 192;
  const ctx = faceCanvas.getContext('2d');
  ctx.translate(96, 96);
  const gold = ctx.createLinearGradient(-70, -78, 62, 80);
  for (const [at, color] of [[0,'#fff0a8'],[.32,'#e6ab4a'],[.50,'#ffdf80'],[.74,'#c38b35'],[1,'#e8b955']]) gold.addColorStop(at,color);
  function ring(radius, color, thickness) {
    ctx.beginPath(); ctx.arc(0,0,radius,0,2*Math.PI);
    ctx.strokeStyle=color; ctx.lineWidth=thickness; ctx.stroke();
  }
  ctx.fillStyle=gold;
  ctx.beginPath(); ctx.arc(0,0,95,0,2*Math.PI); ctx.fill();
  ring(91,'#fff0b2',5); ring(86,'#a36628',3); ring(74,'#fff0aa',2);
  ctx.save(); ctx.strokeStyle='#ae7931'; ctx.lineWidth=2;
  for (let i=0;i<64;i++) {
    ctx.rotate(Math.PI/32); ctx.beginPath(); ctx.moveTo(79,0); ctx.lineTo(83,0); ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold italic 105px Georgia, serif';
  ctx.fillStyle='#9b6225'; ctx.fillText('R',2,6);
  ctx.fillStyle='#ffec9e'; ctx.fillText('R',0,2);
  return faceCanvas;
}

export function makeCoin(parent,x,y,z) {
  if (!geometry) {
    geometry=new CylinderGeometry(.27,.27,.055,32);
    const edge=new MeshStandardMaterial({color:0xbd843b,metalness:.76,roughness:.35});
    const face=new MeshStandardMaterial({color:0xffdf9a,metalness:.63,roughness:.30});
    if (typeof document!=='undefined') {
      face.map=new CanvasTexture(coinFace());
      face.map.colorSpace=SRGBColorSpace;
      face.bumpMap=face.map; face.bumpScale=.009;
    }
    materials=[edge,face,face];
  }
  const mesh=new Mesh(geometry,materials);
  mesh.rotation.order='YXZ';
  mesh.rotation.x=Math.PI/2;
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
}

export function spinCoin(mesh,time,index,baseY) {
  mesh.rotation.y=time*3.8+index*.64;
  mesh.position.y=baseY+.06*Math.sin(time*3.5+index*.72);
}

export function drawLiteCoin(ctx,point,time,index) {
  const angle=time*3.8+index*.64;
  const radius=point.k*.27;
  const width=Math.max(.035,Math.abs(Math.cos(angle)))*radius;
  const edge=radius*.20*Math.sin(angle);
  const y=point.y-point.k*.06*Math.sin(time*3.5+index*.72);
  ctx.fillStyle='#ad7838';
  ctx.beginPath(); ctx.ellipse(point.x+edge*.5,y,width+Math.abs(edge)*.5,radius,0,0,2*Math.PI); ctx.fill();
  ctx.drawImage(coinFace(),point.x-width,y-radius,width*2,radius*2);
}
