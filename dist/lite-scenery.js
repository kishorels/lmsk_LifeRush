const streetImage = name => {
  const image = new Image();
  image.src = new URL('./assets/street/' + name + '.webp', import.meta.url).href;
  return image;
};

export function createLiteScenery(ctx, project, polygon, box) {
  const asphalt = streetImage('asphalt');
  const pavers = streetImage('pavers');
  const trees = ['neem', 'palm'].map(streetImage);
  const clouds = [0, 1, 2].map(cloudImage);
  const quad = (points, color) => polygon(points.map(point => {
    const p = project(...point);
    return [p.x, p.y];
  }), color);

  function cloudLayer(w, h, time, weather) {
    ctx.save();
    ctx.globalAlpha = .92 - .49 * Math.max(weather.night, weather.rain);
    for (let i = 0; i < 6; i++) {
      const span = w * 1.55;
      const x = ((i * w * .29 - time * (13 + 5 * (i % 3))) % span + span) % span - w * .30;
      const width = w * (.26 + .055 * (i % 3));
      ctx.drawImage(clouds[i % 3], x, h * (.072 + .055 * (i % 4)), width, width * .42);
    }
    ctx.restore();
  }

  function tree(x, z, variant, distance) {
    const palm = Math.round(z + distance) % 3 === 1;
    const sprite = trees[Number(palm)];
    const p = project(x, z);
    const height = p.k * (4.7 + variant);
    if (sprite.complete && sprite.naturalWidth) {
      const width = height * sprite.naturalWidth / sprite.naturalHeight;
      ctx.drawImage(sprite, p.x - width / 2, p.y - height, width, height);
    }
  }

  function roadStrip(left, right, image, length, distance, color) {
    const far = 180, near = -1.5;
    quad([[left,near],[right,near],[right,far],[left,far]], color);
    if (!image.complete || !image.naturalWidth) return;
    // Horizontal slices keep the texture in road perspective as it travels toward the runner.
    const sections = 4, step = length / sections;
    const offset = ((distance % length) + length) % length;
    for (let index = 0; index * step - offset - length < far; index++) {
      const start = index * step - offset - length;
      const end = start + step;
      if (end <= near) continue;
      const a = project(left, Math.max(start,near));
      const b = project(right, Math.min(far,end));
      const c = project(right, Math.max(start,near));
      const d = project(left, Math.min(far,end));
      const stripY = (sections - 1 - index % sections) * image.height / sections;
      const cut = Math.max(0,near-start) / step * image.height / sections;
      const croppedHeight = image.height / sections - cut;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x,a.y+.5); ctx.lineTo(c.x,c.y+.5);
      ctx.lineTo(b.x,b.y-.5); ctx.lineTo(d.x,d.y-.5);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(image,0,stripY,image.width,croppedHeight,a.x,b.y-.5,c.x-a.x,a.y-b.y+1);
      ctx.restore();
    }
  }

  function road(distance, weather) {
    roadStrip(-3.55,3.55,asphalt,16,distance,'#515454');
    for (const side of [-1,1]) {
      roadStrip(side*4.35-.8,side*4.35+.8,pavers,5,distance,'#aca395');
      const left = side*3.56-.035, right = side*3.56+.035;
      quad([[left,-1.5],[right,-1.5],[right,138],[left,138]],'#e6dbbb');
    }
    if (weather.rain > .02 || weather.night > .02) {
      quad([[-3.55,-1.5],[3.55,-1.5],[3.55,180],[-3.55,180]],
        `rgba(21,37,52,${.25 * weather.rain + .30 * weather.night})`);
    }
    for (let z = -(distance % 7); z < 155; z += 7) {
      const near = Math.max(-1.5,z), far = z+3.4;
      if (far <= near) continue;
      for (const x of [-1.1,1.1]) quad([
        [x-.045,near],[x+.045,near],[x+.045,far],[x-.045,far]
      ],'#e0ddd1');
    }
  }

  function bus(x, start, end, width, roof, facingAway = false) {
    const z = Math.max(-1, start);
    if (end <= z) return;
    const center = project(x,z);
    const side = center.x < ctx.canvas.clientWidth / 2 ? 1 : -1;
    const edge = x + side * width / 2;
    const body = facingAway ? '#ddad42' : '#e2af45';
    const paint = '#ae7b2b';
    const sidePanel = (from,to,bottom,top,color) => quad([
      [edge,from,bottom],[edge,to,bottom],[edge,to,top],[edge,from,top]
    ],color);
    const face = (offset,y,w,h,color) => quad([
      [x+offset-w/2,z,y],[x+offset+w/2,z,y],
      [x+offset+w/2,z,y+h],[x+offset-w/2,z,y+h]
    ],color);
    const base = project(x,z);
    const shadow = ctx.createRadialGradient(base.x,base.y,0,base.x,base.y,base.k*.95);
    shadow.addColorStop(0,'#12171683'); shadow.addColorStop(1,'#12171600');
    quad([[x-width*.72,z-.08],[x+width*.72,z-.08],[x+width*.72,end],[x-width*.72,end]],shadow);
    box(x,z,width,roof-.48,end-z,body,paint,'#eed48e',.42,side);
    box(x,z,width*.88,.12,end-z,'#f3d586','#d5a353','#eac976',roof-.14,side);
    sidePanel(z,end,.65,.77,'#634c34');
    sidePanel(z,end,roof*.65,roof*.88,'#1d2e35');
    for (let from=start+.72; from+.16<end-.45; from+=1.43) {
      const near = Math.max(z,from);
      const far = Math.min(end-.35,from+1.27);
      if (far <= near) continue;
      sidePanel(near,far,roof*.68,roof*.85,'#54727a');
      sidePanel(near,far,roof*.69,roof*.71,'#95aab0');
      sidePanel(near,far,roof*.53,roof*.56,'#c69643');
    }
    for (const at of [start+1.35,end-1.45]) {
      if (at-.45<z || at+.45>end) continue;
      const tire = [];
      for (let i=0;i<16;i++) {
        const angle = i * Math.PI / 8;
        tire.push([edge,at+.46*Math.cos(angle),.44+.44*Math.sin(angle)]);
      }
      quad(tire,'#242626');
      const hub = project(edge,at,.44);
      const longitudinal = Math.abs(project(edge,at+.18,.44).x-project(edge,at-.18,.44).x);
      ctx.fillStyle = '#a4a29a';
      ctx.beginPath(); ctx.ellipse(hub.x,hub.y,Math.max(.38,longitudinal/2),hub.k*.18,0,0,Math.PI*2); ctx.fill();
    }
    if (start < z) return;
    const glass = ctx.createLinearGradient(0,center.y-roof*center.k,0,center.y-roof*.6*center.k);
    glass.addColorStop(0,'#99b3bd'); glass.addColorStop(.52,'#476671'); glass.addColorStop(1,'#25383f');
    face(0,roof*.59,width*.86,roof*.31,'#283439');
    face(0,roof*.62,width*.77,roof*.25,glass);
    face(0,roof*.62,.035,roof*.25,'#263337');
    face(0,.38,width*1.01,.17,'#323534');
    face(0,.59,width*.39,.15,facingAway?'#c6c5ad':'#424641');
    for (const direction of [-1,1]) {
      face(direction*width*.345,.57,width*.18,.20,'#423a31');
      face(direction*width*.345,.60,width*.14,.14,facingAway?'#d84633':'#fff1bd');
      if (!facingAway) face(direction*width*.51,roof*.64,width*.09,roof*.12,'#262d2e');
    }
  }

  return {cloudLayer,tree,road,bus};
}

function cloudImage(variant) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 116;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 55; i++) {
    const x = 25 + (i*83+variant*43)%218;
    const arch = Math.sin((x-24)/221*Math.PI);
    const y = 72-arch*(12+(i*43%35));
    const radius = 10+(i*61%23)*(.5+arch*.5);
    const puff = ctx.createRadialGradient(x,y-radius*.24,0,x,y,radius);
    puff.addColorStop(0,'#f8fafce0');
    puff.addColorStop(.48,'#e3eaf1ac');
    puff.addColorStop(1,'#becddb00');
    ctx.fillStyle = puff;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  return canvas;
}
