import * as THREE from 'three';
import { PATH, TRIPTYCH, triptychHeight, triptychWater, pathHeight } from '../shared/positions.js';
import { corridorDistance } from '../core/Corridor.js';
import { composite, ball, cube, cone, cylinder, part } from './AmbientGeometry.js';

const TYPES = {
  fern: ['eden',32,1.8,3.2], pod: ['eden',20,1,2.4], coral: ['eden',16,1.6,4.5],
  bird: ['eden',18,1.4,1], fish: ['eden',12,0.75,0.2], amphibian: ['eden',18,0.23,0.2],
  strawberry: ['garden',18,1.3,2.6], cherry: ['garden',18,1.4,2.8], blackberry: ['garden',16,1.2,2.4],
  pomegranate: ['garden',16,1.7,2.4], sphere: ['garden',12,1.8,3.6], figure: ['garden',12,0.5,2],
  chimney: ['garden',12,2,8], owl: ['garden',8,0.8,2.6], mount: ['garden',28,2.15,3.2],
  seed: ['garden',12,0.15,0.15], drum: ['hell',12,2,2.8], bagpipe: ['hell',10,1.6,3.8],
  horn: ['hell',12,1.8,2.5], hurdyGurdy: ['hell',10,1.6,2.6], ear: ['hell',16,1.4,2.4],
  dice: ['hell',18,1.2,1.6], ice: ['hell',24,1.6,5], trapped: ['hell',18,1.7,0.3], sheet: ['hell',0,1.7,0.1], splinter: ['hell',16,.15,.15],
};
const LANDMARKS = [
  [TRIPTYCH.edenFountain,4.5],[TRIPTYCH.rings,7],[TRIPTYCH.dragonTree,4],
  [TRIPTYCH.sphere,6.5],[TRIPTYCH.strawberry,7],[TRIPTYCH.owl,5],
  [TRIPTYCH.lute,8],[TRIPTYCH.harp,5],[TRIPTYCH.score,4],[TRIPTYCH.treeMan,9],[TRIPTYCH.throne,9],
  ...TRIPTYCH.towers.map(p=>[p,3.5]),
];

export function ambientClearance(item, x=item.x, z=item.z) {
  const landmarks = Math.min(...LANDMARKS.map(([p,r])=>Math.hypot(x-p.x,z-p.z)-r-item.radius));
  if (item.permitted === 'airborne') return 1;
  if (item.permitted === 'perch' || item.permitted === 'clutter') return landmarks;
  return Math.min(landmarks,corridorDistance(x,z,PATH)-1-item.radius);
}

export function createAmbientLayout({ seed = 1490, density = 1, perches = [] } = {}) {
  if (!Number.isFinite(density) || density < 0) throw new RangeError('Ambient density must be non-negative');
  const random = () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const items = [];
  for (const [type,[act,count,radius,height]] of Object.entries(TYPES)) {
    if (type === 'figure') continue;
    for (let i=0;i<Math.round(count*density);i++) {
      let item;
      for (let attempt=0;attempt<10000;attempt++) {
        const range=TRIPTYCH.acts[act],scale=['amphibian','seed','splinter'].includes(type)?1:0.75+random()*0.4;
        let x=range[0]+3+random()*(range[1]-range[0]-6),z=-35+random()*70;
        let permitted;
        if(type==='bird')permitted='airborne';
        if(['amphibian','seed','splinter'].includes(type)){
          permitted='clutter';const routes=PATH.filter(p=>p.act===act&&p.kind!=='bridge');
          const route=routes[Math.floor(random()*routes.length)],t=0.2+random()*0.6;
          x=THREE.MathUtils.lerp(route.a.x,route.b.x,t);z=THREE.MathUtils.lerp(route.a.z,route.b.z,t)+0.7;
        }
        if(type==='amphibian'){
          const a=random()*Math.PI*2,r=7.3+random()*1.2;x=-72+Math.cos(a)*r;z=-5+Math.sin(a)*r;
        }
        if(type==='fish'){
          const a=random()*Math.PI*2,r=5.4+random()*0.8;
          x=-72+Math.cos(a)*r;z=-5+Math.sin(a)*r;
        }
        if(type==='owl'&&perches.length){
          const p=perches[Math.floor(random()*perches.length)];x=p.x;z=p.z;
          if(x<=-32||x>=32)continue;
          permitted='perch';
        }
        let orbit;
        if(type==='mount'){orbit=attempt===0?i/count*Math.PI*2:random()*Math.PI*2;x=Math.cos(orbit)*21;z=Math.sin(orbit)*21;}
        let y=triptychWater(x,z)?0.15:triptychHeight(x,z);
        if(type==='bird')y+=11+random()*6;
        if(type==='sphere')y+=3+random()*6;
        if(type==='owl')y=pathHeight(x,z)+1.72;
        if(type==='fish')y=triptychHeight(x,z)+0.13;
        if(type==='trapped'){
          x=59+(random()-.5)*12;z=-13+(random()-.5)*21;y=triptychHeight(x,z)+0.13;
        }
        item={type,act,x,y,z,scale,radius:radius*scale,height:height*scale,phase:orbit??random()*Math.PI*2,permitted};
        if(ambientClearance(item)>=0)break;
        item=null;
      }
      if(!item)throw new Error(`No clear ambient placement for ${type}`);
      items.push(item);
      if(type==='sphere')items.push({...item,type:'figure',radius:0.5*item.scale,height:2*item.scale,y:item.y+0.45});
      if(type==='trapped')items.push({...item,type:'sheet'});
    }
  }
  return items;
}

export function ambientPose(item,time) {
  let {x,y,z}=item,angle=item.phase,scale=item.scale;
  if(item.type==='mount'){
    const a=item.phase+time*0.055;x=Math.cos(a)*21;z=Math.sin(a)*21;
    y=triptychWater(x,z)?0.2:triptychHeight(x,z);angle=-a;
    scale*=THREE.MathUtils.smoothstep(ambientClearance(item,x,z),0,1.5);
  }else if(item.type==='bird'){
    x+=Math.cos(time*.24+item.phase)*2;z+=Math.sin(time*.24+item.phase)*2;angle=-time*.24-item.phase;
  }else if(item.type==='fish'){
    angle+=time*.3;scale*=1+Math.sin(time*.8+item.phase)*.07;
  }else if(item.type==='amphibian'){
    x+=Math.sin(time*.4+item.phase)*.025;z+=Math.cos(time*.3+item.phase)*.025;
  }
  const grounded=['fern','coral','chimney','ice','trapped','sheet','amphibian','seed','splinter','owl'].includes(item.type);
  if(!grounded)y+=Math.sin(time*1.1+item.phase)*.1;
  return {x,y,z,angle,scale};
}

function model(type) {
  const p=[],add=(...args)=>p.push(part(...args));
  const dark='#343643',skin='#b5a487',green='#507d59',pink='#d49ba6';
  if(type==='fern'){
    for(let i=0;i<6;i++){
      const shape=new THREE.Shape();shape.moveTo(0,0);
      for(let j=0;j<5;j++){shape.lineTo(-.35*(1-j/5),.3+j*.45);shape.lineTo(-.08,.5+j*.45);}
      shape.lineTo(0,2.8);
      for(let j=4;j>=0;j--){shape.lineTo(.08,.5+j*.45);shape.lineTo(.35*(1-j/5),.3+j*.45);}
      shape.closePath();
      add(new THREE.ShapeGeometry(shape),i%2?green:'#829861',[0,.15,0],[1,1,1],[.55,i*Math.PI/3,0]);
    }
    add(cone(),green,[0,.6,0],[.3,1.2,.3]);
  }else if(type==='pod'){
    add(cylinder(),green,[0,.6,0],[.12,1.2,.12]);add(ball(),'#b9c78c',[0,1.6,0],[.7,1,.7]);
    add(ball(),'#fff0ad',[0,1.8,.5],[.23,.35,.23]);
  }else if(type==='coral'||type==='chimney'){
    const h=type==='chimney'?5.5:2.7;
    add(cone(),pink,[0,h/2,0],[.8,h,.8]);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3,x=Math.cos(a),z=Math.sin(a);
      add(cone(),i%2?'#a1bdca':pink,[x*.65,h*.7,z*.65],[.35,h*.6,.35],[z*.6,0,-x*.6]);
      add(ball(),i%2?'#a1bdca':pink,[x,h,z],[.6,.85,.6]);
      if(type==='chimney')add(new THREE.TorusGeometry(.4,.12,3,8),dark,[x,h+.65,z],[1,1,1],[Math.PI/2,0,0]);
    }
  }else if(type==='bird'){
    add(ball(),'#e6d7ba',[0,0,0],[.25,.3,.7]);
    for(let i=0;i<3;i++)add(cone(),i===2?pink:'#bec4ad',[Math.cos(i*2.1)*.65,.1,Math.sin(i*2.1)*.6],[.3,1.4,.07],[0,i*2.1,1.2]);
    add(cone(),'#d89957',[0,0,-.85],[.13,.5,.13],[Math.PI/2,0,0]);
  }else if(type==='fish'){
    add(new THREE.RingGeometry(.58,.65,16).rotateX(-Math.PI/2),'#b4d5c9',[0,0,0]);
    for(let i=0;i<3;i++){const a=i*2.1;add(ball(),'#bda673',[Math.cos(a)*.45,0,Math.sin(a)*.45],[.08,.04,.2],[0,-a,0]);}
  }else if(type==='amphibian'){
    add(ball(),green,[0,.07,0],[.14,.07,.18]);
    for(const s of [-1,1]){
      add(ball(),'#dbbc66',[s*.075,.14,-.08],[.04,.04,.04]);
      for(const z of [-.1,.1])add(cone(),green,[s*.17,.035,z],[.05,.07,.08],[0,0,s*.7]);
    }
  }else if(['strawberry','cherry','blackberry','pomegranate','seed','splinter'].includes(type)){
    if(type==='strawberry'){
      add(cone(),'#b94b5b',[0,1,0],[1,2,1],[0,0,Math.PI]);
      for(let i=0;i<5;i++)add(cone(),green,[Math.cos(i*1.26)*.4,2,Math.sin(i*1.26)*.4],[.3,.8,.08],[0,-i*1.26,.9]);
      for(let i=0;i<8;i++)add(ball(),'#e5bc78',[Math.cos(i*2.4)*.65,.5+i*.17,Math.sin(i*2.4)*.65],[.06,.08,.05]);
    }else if(type==='cherry'){
      for(const s of [-1,1]){
        add(ball(),'#a93e5d',[s*.5,.8,0],[.7,.8,.7]);
        add(cylinder(),green,[s*.25,1.9,0],[.06,1.4,.06],[0,0,s*.35]);
      }
    }else if(type==='blackberry'){
      for(let i=0;i<12;i++){const a=i*2.4;add(ball(),i%2?'#55425c':'#77627b',[Math.cos(a)*.65,.4+(i%4)*.48,Math.sin(a)*.65],[.44,.45,.44]);}
    }else if(type==='pomegranate'){
      for(const s of [-1,1]){
        add(new THREE.SphereGeometry(1,6,4,0,Math.PI),'#b56b72',[s*.6,1,0],[.8,.9,.8],[0,s*.65,0]);
        for(let i=0;i<6;i++)add(ball(),'#e5a397',[s*.65+Math.cos(i)*.45,1+Math.sin(i)*.5,.35],[.18,.18,.18]);
      }
    }else add(ball(),type==='splinter'?'#b5cbd3':'#b99c72',[0,.07,0],[.12,.07,.12]);
  }else if(type==='sphere'){
    add(new THREE.SphereGeometry(1,10,6),'#d6e5de',[0,1.65,0],[1.65,1.65,1.65]);
  }else if(type==='figure'||type==='trapped'){
    const flat=type==='trapped';
    add(ball(),dark,flat?[0,.02,0]:[0,.8,0],flat?[.3,.04,.8]:[.3,.7,.25]);
    add(ball(),dark,flat?[0,.02,-.9]:[0,1.7,0],flat?[.23,.05,.23]:[.23,.25,.23]);
  }else if(type==='sheet'){
    add(new THREE.PlaneGeometry(1.8,2.8).rotateX(-Math.PI/2),'#b5d3d7',[0,.12,-.25]);
  }else if(type==='owl'){
    add(ball(),'#9c8c73',[0,1,0],[.65,1,.55]);add(ball(),'#b9ac90',[0,2,0],[.8,.65,.6]);
    for(const s of [-1,1]){
      add(ball(),'#e9d69e',[s*.3,2.15,.5],[.27,.28,.09]);add(ball(),dark,[s*.3,2.15,.59],[.11,.14,.05]);
      add(cone(),'#9c8c73',[s*.5,2.55,0],[.2,.55,.2]);
    }
    add(cone(),'#c69d67',[0,1.9,.7],[.15,.4,.15],[Math.PI/2,0,0]);
  }else if(type==='mount'){
    add(ball(),'#b9afa0',[0,1,0],[1.3,.6,.65]);add(ball(),pink,[0,1.65,-1],[.5,.65,.5]);
    add(cone(),'#c3a66b',[0,1.65,-1.65],[.2,.8,.3],[Math.PI/2,0,0]);
    for(const x of [-.65,.65])for(const z of [-.6,.6])add(cube(),dark,[x,.45,z],[.17,.9,.17],[0,0,x*.2]);
    add(ball(),skin,[0,2,0],[.3,.6,.3]);add(ball(),skin,[0,2.8,0],[.3,.3,.3]);
    add(cone(),'#89758e',[0,3.3,0],[.18,.8,.18]);
  }else if(type==='drum'){
    add(cylinder(),'#72534a',[0,1,0],[1.5,1.7,1.5],[.2,0,.3]);
    add(cylinder(),'#b6a78b',[0,1.9,0],[1.5,.08,1.5],[.2,0,.3]);
    add(cube(),dark,[.25,1.9,0],[.22,.15,2.8],[0,.5,0]);
  }else if(type==='bagpipe'){
    add(ball(),'#85585c',[0,1,0],[1,.8,.7]);
    for(let i=0;i<3;i++){add(cylinder(),'#9c8c72',[(i-1)*.6,2.35,0],[.14,2.1,.14],[0,0,(i-1)*.3]);add(cone(),dark,[(i-1)*.85,3.4,0],[.3,.5,.3]);}
  }else if(type==='horn'){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1,.2,0),new THREE.Vector3(-.2,.2,0),new THREE.Vector3(.6,.7,0),new THREE.Vector3(.8,1.5,0)]);
    add(new THREE.TubeGeometry(curve,5,.22,4,false),'#a28c61');
    add(new THREE.ConeGeometry(.8,1,6,1,true),'#b39c70',[.8,1.6,0],[1,1,1],[Math.PI,0,0]);
  }else if(type==='hurdyGurdy'){
    add(cube(),'#896754',[0,.6,0],[1.8,.7,2.5],[.15,0,.2]);
    add(cylinder(),'#ba9c6d',[0,1.1,0],[.65,.18,.65],[Math.PI/2,0,0]);
    add(cube(),'#bbaa8e',[0,1.35,-.7],[.8,.2,1]);
    add(cube(),dark,[1.1,.8,.5],[.6,.12,.12],[0,0,.5]);
  }else if(type==='ear'){
    add(new THREE.TorusGeometry(.8,.25,4,10,Math.PI*1.8),'#a27b76',[0,1.1,0],[1,1.4,.7]);
    add(new THREE.TorusGeometry(.35,.18,3,8,Math.PI*1.6),'#795e61',[0,1.05,.1],[1,1.4,.6]);
    add(ball(),'#a27b76',[.2,.25,0],[.4,.35,.3]);
  }else if(type==='dice'){
    add(cube(),'#b6b6ac',[0,.8,0],[1.5,1.5,1.5],[0,.2,.15]);
    for(const x of [-.35,.35])for(const y of [.45,1.15])add(ball(),dark,[x,y,.78],[.13,.13,.04]);
  }else if(type==='ice'){
    for(let i=0;i<3;i++)add(cone(),i%2?'#7396aa':'#a2bfca',[(i-1)*.5,1.4+i*.55,0],[.55,2.8+i*1.1,.55],[0,0,(i-1)*.2]);
  }
  return composite(p);
}

export class AmbientProps {
  constructor(scene, options = {}) {
    this.items=createAmbientLayout(options);this.time=0;this.elapsed=1;this.batches=[];
    this.matrix=new THREE.Object3D();this.particles=[];
    for(const type of Object.keys(TYPES)){
      const items=this.items.filter(p=>p.type===type);if(!items.length)continue;
      const material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
      if(type==='pod'){material.emissive.set('#697b3b');material.emissiveIntensity=.5;}
      if(type==='sphere'){material.transparent=true;material.opacity=.18;material.depthWrite=false;}
      if(type==='sheet'){material.transparent=true;material.opacity=.3;material.depthWrite=false;}
      const mesh=new THREE.InstancedMesh(model(type),material,items.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.name=`ambient:${type}`;
      scene.add(mesh);this.batches.push({mesh,items});
    }
    for(const [act,range] of Object.entries(TRIPTYCH.acts)){
      const points=[],colors=[];
      for(let i=0;i<96;i++){
        points.push(range[0]+(i*17.71)%(range[1]-range[0]),1+(i*1.31)%9,-35+(i*13.47)%70);
        const ink=new THREE.Color(act==='hell'?(i%3?'#eb9b58':'#757776'):'#eadbac');colors.push(ink.r,ink.g,ink.b);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      const material=new THREE.PointsMaterial({vertexColors:true,size:act==='hell'?.13:.075,transparent:true,opacity:.5,depthWrite:false});
      const mesh=new THREE.Points(geometry,material);mesh.name=`ambient:${act}:particles`;scene.add(mesh);
      this.particles.push({mesh,act,base:points});
    }
  }
  update(dt,position){
    this.time+=dt;this.elapsed+=dt;if(this.elapsed<.12||!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return;
    this.elapsed=0;
    const distance=45-10*THREE.MathUtils.smoothstep(position.x,35,55);
    for(const {mesh,items} of this.batches){
      let count=0;
      for(const item of items){
        const pose=ambientPose(item,this.time);
        pose.scale*=THREE.MathUtils.smoothstep(distance-Math.hypot(pose.x-position.x,pose.z-position.z),0,6);
        if(pose.scale===0)continue;
        this.matrix.position.set(pose.x,pose.y,pose.z);this.matrix.scale.setScalar(pose.scale);
        this.matrix.rotation.set(Math.sin(this.time*.8+item.phase)*.025,pose.angle,Math.cos(this.time*.7+item.phase)*.02);
        this.matrix.updateMatrix();mesh.setMatrixAt(count++,this.matrix.matrix);
      }
      mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    }
    for(const {mesh,act,base} of this.particles){
      const range=TRIPTYCH.acts[act];mesh.visible=position.x>range[0]-45&&position.x<range[1]+45;
      if(!mesh.visible)continue;
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++)vertices.setXYZ(i,base[i*3]+Math.sin(this.time*.3+i)*.5,triptychHeight(base[i*3],base[i*3+2])+(base[i*3+1]+this.time*(act==='hell'?.7:.14))%10,base[i*3+2]+Math.cos(this.time*.2+i)*.4);
      vertices.needsUpdate=true;mesh.geometry.computeBoundingSphere();
    }
  }
}
