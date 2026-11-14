import * as THREE from 'three';
import { TRIPTYCH, triptychHeight } from '../shared/positions.js';
import {
  fountain, bubble, paintedBackdrop, stoneRings, dragonTree, organicSpire, owl,
  peelableStrawberry, instruments, scorePlaque, treeMan, birdThrone, paint, box, orb,
} from '../core/procedural.js';
import { BoschOilPass } from '../shaders/BoschOilShader.js';
import { PuzzleProgress, RING_START, LUTE_NOTES } from '../core/PuzzleProgress.js';

const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);
const colours = ['#bfcdb1','#d4dfe0','#11151c'].map(c => new THREE.Color(c));
const grounds = ['#64845b','#8caa77','#252b32'].map(c => new THREE.Color(c));

export class TriptychWorld {
  constructor({ renderer, scene, camera }) {
    Object.assign(this, { renderer, scene, camera });
    this.interactables = []; this.obstacles = []; this.animations = []; this.time = 0;
    scene.background = colours[0].clone(); scene.fog = new THREE.Fog(colours[0],40,150);
    this.hemisphere = new THREE.HemisphereLight('#fff1c6','#5b714f',2.6);
    this.sun = new THREE.DirectionalLight('#f9dfab',1.4); this.sun.position.set(-70,50,25);
    scene.add(this.hemisphere,this.sun);
    this.buildTerrain(); this.buildEden(); this.buildGarden(); this.buildHell(); this.buildShutters();
    this.oil = new BoschOilPass(renderer,scene,camera);
    scene.userData.triptych = this;
  }
  place(object, position, radius = 0) {
    object.position.set(position.x,triptychHeight(position.x,position.z),position.z);
    this.scene.add(object);
    if (radius) this.obstacles.push({ ...position, radius });
    if (object.userData.update) this.animations.push(object.userData.update);
    return object;
  }
  buildTerrain() {
    const geometry = new THREE.PlaneGeometry(250,100,200,80).rotateX(-Math.PI/2);
    geometry.translate(-10,0,0);
    const vertices = geometry.attributes.position, colors = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i);
      vertices.setY(i,triptychHeight(x,z));
      const c = grounds[0].clone().lerp(grounds[1],smooth(-40,-30,x)).lerp(grounds[2],smooth(30,45,x));
      const path = 1-smooth(1.5,3.6,Math.abs(z-26));
      c.lerp(new THREE.Color(x > 40 ? '#56544b' : '#b6b18a'),path*0.42);
      c.multiplyScalar(0.94 + Math.sin(x*1.7+Math.cos(z*0.6))*0.025 + Math.cos(z*2.8)*0.02);
      colors.push(c.r,c.g,c.b);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); geometry.computeVertexNormals();
    this.scene.add(new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true})));
    for (let i = 0; i < 3; i++) {
      const hills = paintedBackdrop(i); hills.scale.set(0.85,1.5,1);
      hills.position.set(-65+i*15,13,-43-i*7); this.scene.add(hills);
    }
    const tuftGeometry = new THREE.ConeGeometry(0.13,0.65,3);
    const tufts = new THREE.InstancedMesh(tuftGeometry,paint('#6d8b59'),650);
    const matrix = new THREE.Object3D();
    for (let i = 0; i < 650; i++) {
      const x = -99 + (i*17.31)%131, z = -37+(i*11.97)%74;
      matrix.position.set(x,triptychHeight(x,z)+0.25,z); matrix.rotation.y=i*2.4;
      matrix.scale.setScalar(Math.abs(z-26)<3 || Math.hypot(x,z)<18 ? 0 : 1);
      matrix.updateMatrix(); tufts.setMatrixAt(i,matrix.matrix);
    }
    this.scene.add(tufts);
  }
  buildEden() {
    this.place(fountain(),TRIPTYCH.edenFountain,4);
    const basin = new THREE.Mesh(new THREE.CircleGeometry(7,48).rotateX(-Math.PI/2),paint('#8faea0'));
    basin.position.set(-72,triptychHeight(-72,-5)+0.1,-5); this.scene.add(basin);
    const streamGeometry = new THREE.PlaneGeometry(2,31,1,40).rotateX(-Math.PI/2).rotateY(-0.6).translate(-65,0,7);
    const streamVertices = streamGeometry.attributes.position;
    for(let i=0;i<streamVertices.count;i++)streamVertices.setY(i,triptychHeight(streamVertices.getX(i),streamVertices.getZ(i))+0.07);
    streamGeometry.computeVertexNormals();
    this.scene.add(new THREE.Mesh(streamGeometry,paint('#9bb5a4')));
    const rings = this.rings = this.place(stoneRings(),TRIPTYCH.rings);
    this.ringHandles=[];
    rings.userData.rings.forEach((ring,i) => {
      this.animations.push(ring.userData.update);
      const handle = new THREE.Object3D(), angle=i*Math.PI*2/3;
      handle.position.set(Math.sin(angle)*(1.5+i*0.8),0,Math.cos(angle)*(1.5+i*0.8)); rings.add(handle);
      this.ringHandles.push(handle);
    });
    const dragon=this.place(dragonTree(),TRIPTYCH.dragonTree,2);
    this.dragonFruit=orb(dragon,'#c7484f',[0,2.3,1.8],[0.6,0.8,0.6]);
    for (const p of [{x:-91,z:-19},{x:-52,z:-28},{x:-85,z:13}]) {
      const tree = dragonTree(); tree.scale.setScalar(0.55); this.place(tree,p,1.5);
    }
  }
  buildGarden() {
    const {pool,riverWidth,bridges} = TRIPTYCH;
    const water = new THREE.MeshLambertMaterial({color:'#8fb9bf',transparent:true,opacity:0.88});
    const lake = new THREE.Mesh(new THREE.RingGeometry(pool.island,pool.radius,64).rotateX(-Math.PI/2),water);
    lake.position.y=0.07; this.scene.add(lake);
    for (const [x,z,angle,length] of [[0,28,0,24],[0,-28,0,24],[25.5,0,Math.PI/2,19],[-25.5,0,Math.PI/2,19]]) {
      const river = new THREE.Mesh(new THREE.PlaneGeometry(riverWidth,length).rotateX(-Math.PI/2),water);
      river.position.set(x,0.08,z); river.rotation.y=angle; this.scene.add(river);
    }
    for (const bridge of bridges) {
      const group = new THREE.Group();
      box(group,'#d0be97',[0,0.18,0],[bridge.width,0.34,bridge.length]);
      for (const side of [-1,1]) box(group,'#a99c7d',[side*(bridge.width/2-0.12),0.5,0],[0.16,0.25,bridge.length]);
      group.rotation.y=bridge.rotY; this.place(group,bridge);
    }
    TRIPTYCH.towers.forEach((p,i) => this.place(organicSpire(i%2 ? '#97b4c4' : '#d9a5aa'),p,2.6));
    const glass = this.glass = bubble(4); this.place(glass,TRIPTYCH.sphere); glass.position.y+=4;
    this.animations.push(()=>{glass.material.opacity=0.2+Math.sin(this.time*(this.bubbleOpened?4:1))*0.07;glass.scale.setScalar(this.bubbleOpened?1.06+Math.sin(this.time*3)*0.02:1);});
    const inside = new THREE.Group(); orb(inside,'#d9b7a1',[0,2,0],[0.45,1.3,0.4]); orb(inside,'#e2c8ad',[0,3.6,0],[0.45,0.5,0.45]);
    this.place(inside,TRIPTYCH.sphere);
    this.fruit = this.place(peelableStrawberry(),TRIPTYCH.strawberry,4.2);
    const central = fountain(); central.scale.setScalar(0.7); this.place(central,TRIPTYCH.owl,2.7);
    const bird = this.owl = owl(); bird.scale.setScalar(0.65); this.place(bird,TRIPTYCH.owl); bird.position.y=3.1;
    this.owlFlight=0;
    this.animations.push(dt=>{if(this.owlShooed){this.owlFlight=Math.min(30,this.owlFlight+dt*3);bird.position.y=3.1+this.owlFlight;bird.position.z=TRIPTYCH.owl.z-this.owlFlight;bird.visible=this.owlFlight<30;}});
    this.buildMounts();
    for (let i=0;i<7;i++) {
      const sphere=bubble(0.5+i*0.14); this.place(sphere,{x:-10+i*3,z:-25}); sphere.position.y=3+i%3;
    }
  }
  buildMounts() {
    const count=14, dummy=new THREE.Object3D();
    const geometry=new THREE.SphereGeometry(1,12,8);
    const pieces = [
      {c:'#bca58b',p:[0,1.2,0],s:[0.65,0.7,1.2]},
      {c:'#c9b994',p:[0,2.1,0.9],s:[0.45,0.8,0.4]},
      {c:'#d8c8ac',p:[0,2.8,1.1],s:[0.5,0.4,0.7]},
      ...[-1,1].flatMap(s => [-1,1].map(t=>({c:'#786f57',p:[s*0.4,0.4,t*0.65],s:[0.13,0.6,0.13]}))),
      {c:'#96aab2',p:[0,2.2,-0.4],s:[0.3,0.75,0.3]},
    ];
    const meshes=pieces.map(part=>{const mesh=new THREE.InstancedMesh(geometry,paint(part.c),count);this.scene.add(mesh);return mesh;});
    this.animations.push(() => {
      for(let i=0;i<count;i++) {
        const a=i*Math.PI*2/count+this.time*0.075, r=19;
        const root=new THREE.Matrix4().makeRotationY(-a);
        root.setPosition(Math.cos(a)*r,0,Math.sin(a)*r);
        pieces.forEach((part,j)=>{
          dummy.position.set(...part.p); dummy.position.y+=Math.sin(this.time*4+i)*0.08;
          dummy.scale.set(...part.s); dummy.updateMatrix();
          meshes[j].setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(root,dummy.matrix));
        });
      }
      meshes.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
    });
  }
  buildHell() {
    const ice=new THREE.Mesh(new THREE.CircleGeometry(10,48).rotateX(-Math.PI/2),paint('#72878c'));
    this.place(ice,TRIPTYCH.frozenLake);ice.position.y+=0.06;ice.scale.z=0.75;
    const cracks=new THREE.Group();
    for(let i=0;i<11;i++) {
      const a=i*2.4;
      const line=box(cracks,'#b0bdb7',[Math.sin(a)*4,0.08,Math.cos(a)*4],[0.04,0.02,5+i%4]); line.rotation.y=a;
    }
    this.place(cracks,TRIPTYCH.frozenLake);
    const {lute,harp}=instruments();this.lute=this.place(lute,TRIPTYCH.lute,3);this.place(harp,TRIPTYCH.harp,3);
    const score=this.place(scorePlaque(),TRIPTYCH.score);
    this.score=score;
    this.treeMan=this.place(treeMan(),TRIPTYCH.treeMan,4.5);
    this.throne=this.place(birdThrone(),TRIPTYCH.throne,2.5);
    for(const [x,z,color] of [[62,12,'#b77347'],[80,-8,'#c07c49'],[95,8,'#8ba8b9']]) {
      const light=new THREE.PointLight(color,100,30,2);light.position.set(x,triptychHeight(x,z)+7,z);this.scene.add(light);
    }
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const c=canvas.getContext('2d');
    const glow=c.createRadialGradient(256,220,2,256,180,230);glow.addColorStop(0,'#e9a35b');glow.addColorStop(0.3,'#a43d25');glow.addColorStop(1,'#521e1400');
    c.fillStyle=glow;c.fillRect(0,0,512,256);
    c.fillStyle='#14191b';
    for(let i=0;i<24;i++){const h=15+(i*23)%85;c.fillRect(i*22,256-h,18,h);c.beginPath();c.moveTo(i*22,256-h);c.lineTo(i*22+9,235-h);c.lineTo(i*22+18,256-h);c.fill();}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    for(let i=0;i<6;i++) {
      const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,color:'#ffb47a'});
      const fire=new THREE.Mesh(new THREE.PlaneGeometry(24,16),mat);fire.position.set(40+i*15,0,-43-i%2*4);this.scene.add(fire);
      this.animations.push(()=>{mat.opacity=0.8+Math.sin(this.time*3+i)*0.08+Math.sin(this.time*7+i)*0.04;});
    }
  }
  buildShutters() {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
    const c=canvas.getContext('2d');c.fillStyle='#35332e';c.fillRect(0,0,1024,1024);
    for(let i=0;i<160;i++){c.strokeStyle=i%2?'#9c8f7012':'#0d121328';c.beginPath();c.moveTo(i*6.5,0);c.bezierCurveTo(i*6.5+12,350,i*6.5-12,700,i*6.5,1024);c.stroke();}
    const sphere=c.createRadialGradient(400,340,15,512,490,375);sphere.addColorStop(0,'#c1c2b1');sphere.addColorStop(0.7,'#777e75');sphere.addColorStop(1,'#303e3b');
    c.fillStyle=sphere;c.beginPath();c.arc(512,490,365,0,Math.PI*2);c.fill();
    c.save();c.beginPath();c.arc(512,490,363,0,Math.PI*2);c.clip();
    c.fillStyle='#4e5a53';c.beginPath();c.moveTo(120,550);
    for(let x=120;x<910;x+=6)c.lineTo(x,530+Math.sin(x*0.018)*23+Math.cos(x*0.031)*12);
    c.lineTo(910,800);c.lineTo(120,800);c.fill();
    c.strokeStyle='#b8bca890';c.lineWidth=2;c.beginPath();c.ellipse(512,530,359,73,0,0,Math.PI*2);c.stroke();
    for(let i=0;i<55;i++){const x=230+(i*67)%560,y=560+(i*43)%130;c.fillStyle='#8c948470';c.fillRect(x,y,18,2);}
    c.restore();c.strokeStyle='#bbc0ac';c.lineWidth=3;c.beginPath();c.arc(512,490,365,0,Math.PI*2);c.stroke();
    c.textAlign='center';c.fillStyle='#b6ae94';c.font='24px Georgia';c.fillText('IPSE DIXIT · ET FACTA SUNT',512,940);
    this.shutters=[];
    for(let i=0;i<2;i++) {
      const half=document.createElement('canvas');half.width=512;half.height=1024;
      half.getContext('2d').drawImage(canvas,i*512,0,512,1024,0,0,512,1024);
      const texture=new THREE.CanvasTexture(half);texture.colorSpace=THREE.SRGBColorSpace;
      const hinge=new THREE.Group();hinge.position.set(TRIPTYCH.shutters.x,0,TRIPTYCH.shutters.z+(i?10:-10));
      const localZ=i?-5:5;
      box(hinge,'#292c25',[0,9,localZ],[0.5,18,10]);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(10,18),new THREE.MeshLambertMaterial({map:texture}));
      face.rotation.y=-Math.PI/2;face.position.set(-0.27,9,localZ);hinge.add(face);
      for(const y of [0.3,17.7])box(hinge,'#7d7459',[-0.3,y,localZ],[0.1,0.22,9.6]);
      for(const z of [localZ-4.7,localZ+4.7])box(hinge,'#7d7459',[-0.3,9,z],[0.1,17.5,0.18]);
      this.scene.add(hinge);this.shutters.push(hinge);
    }
    this.opening=null;
  }
  open(onComplete) { if (!this.opening) this.opening={elapsed:0,onComplete}; }
  setShutterAmount(amount) {
    this.shutters[0].rotation.y=-amount*Math.PI/2;this.shutters[1].rotation.y=amount*Math.PI/2;
  }
  configureGameplay(state,sound) {
    this.progress=new PuzzleProgress(state);
    const p=this.progress;
    this.interactables=this.ringHandles.map((object,i)=>({object,radius:3,prompt:()=>`E · turn ring ${i+1} · align all red stones north (${p.rings[i]}/8)`,onPrimary:()=>{
      this.rings.userData.rings[i].rotate();const was=state.puzzlesCompleted.edenRings;
      p.rotateRing(i);if(!was&&state.puzzlesCompleted.edenRings)sound.bell();
      return state.puzzlesCompleted.edenRings?'Three circles agree. The river remembers.':`Stone ring ${i+1} turns one eighth of a circle.`;
    }}));
    const choose=(key,value,text)=>p.decide(key,value)?text:'That choice has already become part of the world.';
    this.interactables.push(
      {object:this.dragonFruit,radius:5,prompt:()=>state.decisions.ateDragonFruit===null?'E · eat dragon fruit / Q · refuse':'The dragon fruit choice is recorded.',onPrimary:()=>{
        const text=choose('ateDragonFruit',true,'You taste the first sweetness.');this.dragonFruit.visible=state.decisions.ateDragonFruit!==true;return text;
      },onSecondary:()=>choose('ateDragonFruit',false,'You leave the fruit upon its branch.')},
      {object:this.glass,radius:6,prompt:()=>state.puzzlesCompleted.gardenBubble?'The glass remembers your touch.':'E · touch the glass sphere',onPrimary:()=>{
        if(!state.puzzlesCompleted.gardenBubble){state.completePuzzle('gardenBubble');this.bubbleOpened=true;sound.bell(880);}
        return 'A transparent boundary is still a boundary.';
      }},
      {object:this.fruit,radius:8,prompt:()=>`E · peel strawberry (${p.peeled}/8)`,onPrimary:()=>{
        if(!this.fruit.peel())return 'The fruit is open; nothing remains concealed.';
        p.peel();sound.bell(523.251+p.peeled*22);return 'A scarlet petal loosens. Sweetness has a hidden cost.';
      }},
      {object:this.owl,radius:6,prompt:()=>state.decisions.owlAction===null?'E · heed the owl / Q · shoo the owl':'The owl choice is recorded.',onPrimary:()=>choose('owlAction','heeded','You listen to a wisdom that offers no answer.'),onSecondary:()=>{
        const text=choose('owlAction','shooed','The owl departs. Silence takes its place.');this.owlShooed=state.decisions.owlAction==='shooed';return text;
      }},
      {object:this.lute,radius:7,prompt:()=>`1 D · 2 F · 3 E · 4 A / play D F E A (${p.luteIndex}/4)`,onPrimary:()=> 'Four strings: 1 D, 2 F, 3 E, 4 A. Play D, F, E, A.',onNote:note=>{
        sound.pluck(LUTE_NOTES[note-1]);const was=state.puzzlesCompleted.hellLute;const solved=p.pluck(note);if(!was&&solved)sound.bell(440);
        return solved?'The broken song is whole.':`The lute answers. ${p.luteIndex} of four notes remembered.`;
      }},
      {object:this.score,radius:4,prompt:()=> 'E · read the score: D F E A',onPrimary:()=> 'D · F · E · A. Four notes remain where every song was broken.'},
      {object:this.treeMan,radius:8,prompt:()=>state.decisions.candleAction===null?'E · keep the candle / Q · snuff the candle':'The candle choice is recorded.',onPrimary:()=>choose('candleAction','kept','You keep a little light for someone who has not arrived.'),onSecondary:()=>{
        const text=choose('candleAction','snuffed','You let the candle go. Darkness is also a kind of shelter.');this.treeMan.userData.setCandle(state.decisions.candleAction!=='snuffed');return text;
      }},
      // The throne ends the story when you reach it; this only tells the player where to go.
      {object:this.throne,radius:14,prompt:()=> 'Walk up to the throne to close the triptych',onPrimary:()=> 'The throne waits at the end of every road.'},
    );
    const kinds=new Map([[this.glass,'bubble'],[this.fruit,'fruit'],[this.lute,'lute']]);
    for(const item of this.interactables){
      for(const action of ['onPrimary','onSecondary']){
        if(!item[action])continue;
        const interact=item[action];
        item[action]=()=>{sound.interaction(this.ringHandles.includes(item.object)?'ring':kinds.get(item.object));return interact();};
      }
    }
    this.resetGameplay();
  }
  resetGameplay() {
    this.progress?.reset();this.rings.userData.rings.forEach((ring,i)=>ring.userData.reset(RING_START[i]));
    this.fruit.userData.reset();this.dragonFruit.visible=true;this.bubbleOpened=false;this.glass.scale.setScalar(1);
    this.owlShooed=false;this.owlFlight=0;this.owl.visible=true;this.owl.position.set(TRIPTYCH.owl.x,3.1,TRIPTYCH.owl.z);
    this.treeMan.userData.setCandle(true);this.time=0;this.opening=null;this.setShutterAmount(0);
  }
  update(dt) {
    this.time+=dt;
    if(this.opening && this.opening.elapsed<3) {
      const o=this.opening;o.elapsed=Math.min(3,o.elapsed+dt);
      const swing=smooth(0,1.5,o.elapsed);
      this.shutters[0].rotation.y=-swing*Math.PI/2;this.shutters[1].rotation.y=swing*Math.PI/2;
      const travel=smooth(1.3,3,o.elapsed);
      this.camera.position.set(THREE.MathUtils.lerp(-126,TRIPTYCH.spawn.x,travel),THREE.MathUtils.lerp(8,triptychHeight(TRIPTYCH.spawn.x,26)+1.7,travel),26);
      if(o.elapsed===3)o.onComplete();
    }
    this.animations.forEach(update=>update(dt));
    const x=this.camera.position.x, garden=smooth(-40,-30,x), hell=smooth(30,40,x);
    this.scene.background.copy(colours[0]).lerp(colours[1],garden).lerp(colours[2],hell);
    this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=THREE.MathUtils.lerp(42,24,hell);this.scene.fog.far=THREE.MathUtils.lerp(155,95,hell);
    this.hemisphere.color.set('#fff1c6').lerp(new THREE.Color('#f4eced'),garden).lerp(new THREE.Color('#596475'),hell);
    this.hemisphere.groundColor.set('#64734c').lerp(new THREE.Color('#b0a397'),garden).lerp(new THREE.Color('#14151b'),hell);
    this.hemisphere.intensity=THREE.MathUtils.lerp(2.6+garden*0.5,0.34,hell);
    this.sun.color.set('#f9dfab').lerp(new THREE.Color('#e0e9ef'),garden).lerp(new THREE.Color('#81919d'),hell);
    this.sun.intensity=THREE.MathUtils.lerp(1.4-garden*0.8,0.18,hell);
    this.oil.pass.uniforms.varnish.value.set('#f5e1b5').lerp(new THREE.Color('#c2bdaf'),hell);
    this.oil.pass.uniforms.strength.value=THREE.MathUtils.lerp(0.72,0.9,hell);
  }
  nearby(position, action) {
    const point=new THREE.Vector3();
    const nearest=this.interactables.filter(item=>!action||item[action]).map(item=>{
      item.object.getWorldPosition(point);return {item,distance:Math.hypot(point.x-position.x,point.z-position.z)};
    })
      .filter(({item,distance})=>distance<=item.radius).sort((a,b)=>a.distance-b.distance)[0];
    return nearest?.item;
  }
  interact(position,secondary=false) {
    const item=this.nearby(position),action=secondary?'onSecondary':'onPrimary';
    return item?.[action]?.() ?? (secondary?'You choose to observe. The world waits.':'Walk closer to a stone ring, the scarlet fruit, or the four-note score.');
  }
  render() {
    this.renderer.info.autoReset=false;this.renderer.info.reset();
    this.oil.render();
  }
}
